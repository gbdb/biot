"""
Serializers pour l'API REST (app mobile Jardin Biot).
"""
from rest_framework import serializers

from gardens.models import GardenGCP
from .models import (
    Organism,
    OrganismPropriete,
    OrganismUsage,
    OrganismCalendrier,
    CompanionRelation,
    Cultivar,
    CultivarPollinator,
    CultivarPorteGreffe,
    Garden,
    Specimen,
    SpecimenFavorite,
    OrganismFavorite,
    SpecimenGroup,
    SpecimenGroupMember,
    Event,
    Reminder,
    Photo,
    UserTag,
)
from .utils import distance_metres_between_specimens, get_pollination_distance_max_m
from .source_rules import (
    find_organism_by_latin_fuzzy,
    find_organism_by_common_name,
    normalize_latin_name,
)


# --- Organism (lecture pour choix espèce) ---
class OrganismMinimalSerializer(serializers.ModelSerializer):
    """Minimal pour listes et choix."""
    is_favori = serializers.SerializerMethodField()
    photo_principale_url = serializers.SerializerMethodField()
    has_availability = serializers.SerializerMethodField()

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return OrganismFavorite.objects.filter(user=request.user, organism=obj).exists()

    def get_photo_principale_url(self, obj):
        request = self.context.get('request')
        photo = getattr(obj, 'photo_principale', None) or obj.photos.first()
        return _get_photo_url(request, photo) if photo else None

    def get_has_availability(self, obj):
        return getattr(obj, 'has_availability', False)

    class Meta:
        model = Organism
        fields = ['id', 'nom_commun', 'nom_latin', 'slug_latin', 'type_organisme', 'genus', 'is_favori', 'photo_principale_url', 'has_availability']


# --- Nested data for organism detail (proprietes, usages, calendrier, companions) ---
class OrganismProprieteSerializer(serializers.ModelSerializer):
    """Propriétés sol/exposition par source."""

    class Meta:
        model = OrganismPropriete
        fields = ['id', 'type_sol', 'ph_min', 'ph_max', 'tolerance_ombre', 'source']


class OrganismUsageSerializer(serializers.ModelSerializer):
    """Usages (comestible, médicinal, etc.) par type."""

    type_usage_display = serializers.CharField(source='get_type_usage_display', read_only=True)

    class Meta:
        model = OrganismUsage
        fields = ['id', 'type_usage', 'type_usage_display', 'parties', 'description', 'source']


class OrganismCalendrierSerializer(serializers.ModelSerializer):
    """Périodes (floraison, récolte, semis) par source."""

    type_periode_display = serializers.CharField(source='get_type_periode_display', read_only=True)

    class Meta:
        model = OrganismCalendrier
        fields = ['id', 'type_periode', 'type_periode_display', 'mois_debut', 'mois_fin', 'source']


class CultivarPollinatorCompanionSerializer(serializers.Serializer):
    """Un compagnon pollinisateur recommandé pour un cultivar (lecture seule)."""
    id = serializers.IntegerField(read_only=True)
    companion_cultivar = serializers.SerializerMethodField()
    companion_organism = serializers.SerializerMethodField()
    notes = serializers.CharField(read_only=True)
    source = serializers.CharField(read_only=True)

    def get_companion_cultivar(self, obj):
        if not obj.companion_cultivar_id:
            return None
        c = obj.companion_cultivar
        return {'id': c.id, 'nom': c.nom, 'slug_cultivar': c.slug_cultivar}

    def get_companion_organism(self, obj):
        if not obj.companion_organism_id:
            return None
        o = obj.companion_organism
        return {'id': o.id, 'nom_commun': o.nom_commun, 'nom_latin': o.nom_latin or ''}


class CultivarPorteGreffeSerializer(serializers.ModelSerializer):
    """Porte-greffe d'un cultivar (lecture seule)."""
    vigueur_display = serializers.CharField(source='get_vigueur_display', read_only=True)

    class Meta:
        model = CultivarPorteGreffe
        fields = [
            'id', 'nom_porte_greffe', 'vigueur', 'vigueur_display',
            'hauteur_max_m', 'disponible_chez', 'notes',
        ]


class CultivarSerializer(serializers.ModelSerializer):
    """Cultivar / variété d'une espèce (liste pour détail organisme) avec pollinisateurs et porte-greffes."""

    pollinateurs_recommandes = serializers.SerializerMethodField()
    porte_greffes = serializers.SerializerMethodField()

    class Meta:
        model = Cultivar
        fields = [
            'id', 'slug_cultivar', 'nom', 'description',
            'couleur_fruit', 'gout', 'resistance_maladies', 'notes',
            'pollinateurs_recommandes', 'porte_greffes',
        ]

    def get_pollinateurs_recommandes(self, obj):
        companions = getattr(obj, 'pollinator_companions', None)
        if companions is None:
            companions = obj.pollinator_companions.all()
        return CultivarPollinatorCompanionSerializer(companions, many=True).data

    def get_porte_greffes(self, obj):
        porte_greffes = getattr(obj, 'porte_greffes', None)
        if porte_greffes is None:
            porte_greffes = obj.porte_greffes.all()
        return CultivarPorteGreffeSerializer(porte_greffes, many=True).data


class CultivarListSerializer(serializers.ModelSerializer):
    """Cultivar pour liste API (avec espèce minimale)."""

    organisme = OrganismMinimalSerializer(source='organism', read_only=True)

    class Meta:
        model = Cultivar
        fields = ['id', 'slug_cultivar', 'nom', 'organisme']


# Companion relation: other organism + relation type (for display on species detail)
_COMPANION_POSITIVE_TYPES = {
    'compagnon_positif', 'fixateur_azote', 'attire_pollinisateurs', 'repousse_nuisibles',
    'abri', 'coupe_vent', 'support_physique', 'mycorhize', 'accumulateur',
}


def _serialize_companion_relation(rel, current_organism_id):
    """Build one companion relation dict for API (other_organism, type, beneficial vs avoid)."""
    if rel.organisme_source_id == current_organism_id:
        other = rel.organisme_cible
        direction = 'as_source'  # this species helps the other
    else:
        other = rel.organisme_source
        direction = 'as_target'  # the other helps this species
    return {
        'id': rel.id,
        'direction': direction,
        'other_organism': {
            'id': other.id,
            'nom_commun': other.nom_commun,
            'nom_latin': other.nom_latin or '',
        },
        'type_relation': rel.type_relation,
        'type_relation_display': rel.get_type_relation_display(),
        'force': rel.force,
        'distance_optimale': rel.distance_optimale,
        'description': rel.description or '',
        'source_info': rel.source_info or '',
        'is_positive': rel.type_relation in _COMPANION_POSITIVE_TYPES,
    }


class OrganismDetailSerializer(serializers.ModelSerializer):
    """Détail complet pour affichage et édition (inclut proprietes, usages, calendrier, compagnons)."""
    is_favori = serializers.SerializerMethodField()
    photo_principale_url = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()
    proprietes = serializers.SerializerMethodField()
    usages = serializers.SerializerMethodField()
    calendrier = serializers.SerializerMethodField()
    cultivars = serializers.SerializerMethodField()
    companion_relations = serializers.SerializerMethodField()

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return OrganismFavorite.objects.filter(user=request.user, organism=obj).exists()

    def get_photo_principale_url(self, obj):
        request = self.context.get('request')
        photo = getattr(obj, 'photo_principale', None) or obj.photos.first()
        return _get_photo_url(request, photo) if photo else None

    def get_photos(self, obj):
        return PhotoSerializer(obj.photos.all(), many=True, context=self.context).data

    def get_proprietes(self, obj):
        return OrganismProprieteSerializer(obj.proprietes.all(), many=True).data

    def get_usages(self, obj):
        return OrganismUsageSerializer(obj.usages.all(), many=True).data

    def get_calendrier(self, obj):
        return OrganismCalendrierSerializer(obj.calendrier.all(), many=True).data

    def get_cultivars(self, obj):
        return CultivarSerializer(obj.cultivars.all(), many=True).data

    def get_companion_relations(self, obj):
        out = []
        for rel in obj.relations_sortantes.all().select_related('organisme_cible'):
            out.append(_serialize_companion_relation(rel, obj.id))
        for rel in obj.relations_entrantes.all().select_related('organisme_source'):
            out.append(_serialize_companion_relation(rel, obj.id))
        return out

    class Meta:
        model = Organism
        fields = [
            'id', 'nom_commun', 'nom_latin', 'slug_latin', 'famille', 'regne', 'type_organisme', 'is_favori',
            'photo_principale_url', 'photos',
            'besoin_eau', 'besoin_soleil', 'zone_rusticite', 'sol_textures', 'sol_ph', 'sol_drainage', 'sol_richesse',
            'hauteur_max', 'largeur_max', 'vitesse_croissance',
            'comestible', 'parties_comestibles', 'toxicite',
            'type_noix', 'age_fructification', 'periode_recolte', 'pollinisation', 'distance_pollinisation_max', 'production_annuelle',
            'fixateur_azote', 'accumulateur_dynamique', 'mellifere', 'produit_juglone', 'indigene',
            'description', 'notes', 'usages_autres',
            'proprietes', 'usages', 'calendrier', 'cultivars', 'companion_relations',
            'enrichment_score_pct',
        ]


class OrganismUpdateSerializer(serializers.ModelSerializer):
    """Pour mettre à jour une espèce depuis l'app mobile."""

    class Meta:
        model = Organism
        fields = [
            'nom_commun', 'nom_latin', 'famille', 'regne', 'type_organisme',
            'besoin_eau', 'besoin_soleil', 'sol_textures', 'sol_ph', 'sol_drainage', 'sol_richesse',
            'hauteur_max', 'largeur_max', 'vitesse_croissance',
            'comestible', 'parties_comestibles', 'toxicite',
            'type_noix', 'age_fructification', 'periode_recolte', 'pollinisation', 'distance_pollinisation_max', 'production_annuelle',
            'fixateur_azote', 'accumulateur_dynamique', 'mellifere', 'produit_juglone', 'indigene',
            'description', 'notes', 'usages_autres',
        ]
        extra_kwargs = {
            'nom_commun': {'required': True},
            'nom_latin': {'required': True},
            'type_organisme': {'required': True},
        }


def find_similar_organisms(nom_commun: str, nom_latin: str, limit: int = 5):
    """
    Trouve les organismes similaires (doublon exact ou proches).
    Retourne (exact_match, similar_list).
    - exact_match: organisme si doublon exact (même nom_commun ET nom_latin), sinon None
    - similar_list: liste d'organismes similaires (fuzzy latin ou nom_commun proche)
    """
    nc = (nom_commun or '').strip()
    nl = (nom_latin or '').strip()
    if not nc and not nl:
        return None, []

    exact = None
    similar_ids = set()

    # 1. Doublon exact : même nom_commun ET nom_latin (insensible à la casse)
    if nc and nl:
        exact = Organism.objects.filter(
            nom_commun__iexact=nc,
            nom_latin__iexact=nl,
        ).first()
        if exact:
            return exact, []

    # 2. Similaires : fuzzy sur nom_latin
    if nl:
        fuzzy_latin = find_organism_by_latin_fuzzy(Organism, nl)
        if fuzzy_latin and fuzzy_latin != exact:
            similar_ids.add(fuzzy_latin.id)

    # 3. Similaires : exact match sur nom_commun (si pas déjà trouvé)
    if nc:
        by_common = find_organism_by_common_name(Organism, nc)
        if by_common and by_common != exact:
            similar_ids.add(by_common.id)

    # 4. Similaires : nom_commun contient ou est contenu (ex: "Pommier" vs "Pommier Dolgo")
    if nc and len(nc) >= 3:
        # Chercher où nom_commun contient notre terme ou inversement
        from django.db.models import Q
        qs = Organism.objects.filter(
            Q(nom_commun__icontains=nc) | Q(nom_commun__istartswith=nc)
        ).exclude(id__in=similar_ids)[:limit]
        for org in qs:
            similar_ids.add(org.id)

    # 5. Similaires : nom_latin proche (mots en commun)
    if nl:
        from django.db.models import Q
        norm = normalize_latin_name(nl)
        if norm:
            words = [w for w in norm.split() if len(w) >= 3]
            if words:
                q = Q()
                for w in words[:3]:  # max 3 mots pour éviter trop large
                    q |= Q(nom_latin__icontains=w)
                for org in Organism.objects.filter(q).exclude(id__in=similar_ids)[:limit]:
                    similar_ids.add(org.id)

    similar = list(
        Organism.objects.filter(id__in=similar_ids).order_by('nom_commun')[:limit]
    )
    return exact, similar


class OrganismCreateSerializer(serializers.ModelSerializer):
    """Pour créer une espèce depuis l'app mobile. Vérifie doublons et similaires."""

    class Meta:
        model = Organism
        fields = ['nom_commun', 'nom_latin', 'type_organisme']

    def validate(self, attrs):
        nom_commun = (attrs.get('nom_commun') or '').strip()
        nom_latin = (attrs.get('nom_latin') or '').strip()
        force_create = self.context.get('force_create', False)

        exact, similar = find_similar_organisms(nom_commun, nom_latin)

        if exact:
            raise serializers.ValidationError({
                'code': 'duplicate',
                'message': 'Cette espèce existe déjà.',
                'existing': OrganismMinimalSerializer(exact).data,
            })

        if similar and not force_create:
            raise serializers.ValidationError({
                'code': 'similar',
                'message': 'Des espèces similaires existent. Utilisez-en une ou confirmez la création.',
                'organisms': OrganismMinimalSerializer(similar, many=True).data,
            })

        return attrs


# --- Garden ---
class GardenMinimalSerializer(serializers.ModelSerializer):
    """Pour listes et choix."""

    class Meta:
        model = Garden
        fields = ['id', 'nom', 'ville', 'adresse', 'latitude', 'longitude']


class GardenCreateSerializer(serializers.ModelSerializer):
    """Création d'un jardin (nom requis, adresse optionnelle)."""

    class Meta:
        model = Garden
        fields = ['nom', 'ville', 'adresse']


class GardenGCPSerializer(serializers.ModelSerializer):
    """Point de contrôle (GCP) pour calibration drone / OpenDroneMap."""
    photo_url = serializers.SerializerMethodField()

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get('request')
        if not request:
            return None
        return request.build_absolute_uri(obj.photo.url)

    class Meta:
        model = GardenGCP
        fields = [
            'id', 'label', 'latitude', 'longitude',
            'photo_url', 'photo', 'date_capture', 'notes',
        ]
        read_only_fields = ['id', 'photo_url']
        extra_kwargs = {'photo': {'write_only': True}}


def _get_photo_url(request, photo):
    """Retourne l'URL absolue d'une photo ou None."""
    if not photo or not photo.image or not request:
        return None
    return request.build_absolute_uri(photo.image.url)


# --- Specimen ---
class SpecimenListSerializer(serializers.ModelSerializer):
    """Liste des spécimens avec organisme et statut."""

    organisme_nom = serializers.CharField(source='organisme.nom_commun', read_only=True)
    organisme_nom_latin = serializers.CharField(source='organisme.nom_latin', read_only=True)
    garden_nom = serializers.SerializerMethodField()
    is_favori = serializers.SerializerMethodField()
    photo_principale_url = serializers.SerializerMethodField()
    rayon_adulte_m = serializers.SerializerMethodField()

    def get_garden_nom(self, obj):
        return obj.garden.nom if obj.garden else None

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return SpecimenFavorite.objects.filter(user=request.user, specimen=obj).exists()

    def get_photo_principale_url(self, obj):
        request = self.context.get('request')
        if obj.photo_principale:
            return _get_photo_url(request, obj.photo_principale)
        # Fallback: première photo du spécimen
        first = obj.photos.first()
        return _get_photo_url(request, first) if first else None

    def get_rayon_adulte_m(self, obj):
        """Rayon adulte estimé en mètres pour le cercle d'emprise sur la carte (≈ 60 % hauteur max)."""
        if not getattr(obj, 'cultivar_id', None) or not obj.cultivar_id:
            return None
        pg = (
            obj.cultivar.porte_greffes.filter(hauteur_max_m__isnull=False)
            .order_by('-hauteur_max_m')
            .first()
        )
        if pg and pg.hauteur_max_m:
            return round(pg.hauteur_max_m * 0.60, 1)
        return None

    class Meta:
        model = Specimen
        fields = [
            'id', 'nom', 'code_identification', 'nfc_tag_uid', 'organisme', 'organisme_nom',
            'organisme_nom_latin', 'garden', 'garden_nom', 'zone_jardin', 'statut', 'sante',
            'date_plantation', 'latitude', 'longitude', 'is_favori', 'photo_principale_url',
            'rayon_adulte_m',
        ]


class SpecimenDetailSerializer(serializers.ModelSerializer):
    """Détail complet d'un spécimen (inclut groupes de pollinisation, calendrier espèce, distance/alerte)."""

    organisme = OrganismMinimalSerializer(read_only=True)
    organism_calendrier = serializers.SerializerMethodField()
    cultivar = serializers.SerializerMethodField()
    garden = GardenMinimalSerializer(read_only=True, allow_null=True)
    is_favori = serializers.SerializerMethodField()
    photo_principale_url = serializers.SerializerMethodField()
    pollination_associations = serializers.SerializerMethodField()
    rayon_adulte_m = serializers.SerializerMethodField()

    def get_organism_calendrier(self, obj):
        if not getattr(obj, 'organisme_id', None) or not obj.organisme_id:
            return []
        return OrganismCalendrierSerializer(obj.organisme.calendrier.all(), many=True).data

    def get_cultivar(self, obj):
        if not getattr(obj, 'cultivar_id', None) or not obj.cultivar_id:
            return None
        c = obj.cultivar
        return {'id': c.id, 'nom': c.nom, 'slug_cultivar': c.slug_cultivar}

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return SpecimenFavorite.objects.filter(user=request.user, specimen=obj).exists()

    def get_photo_principale_url(self, obj):
        request = self.context.get('request')
        if obj.photo_principale:
            return _get_photo_url(request, obj.photo_principale)
        first = obj.photos.first()
        return _get_photo_url(request, first) if first else None

    def get_rayon_adulte_m(self, obj):
        """Rayon adulte estimé en mètres pour le cercle d'emprise sur la carte (≈ 60 % hauteur max)."""
        if not getattr(obj, 'cultivar_id', None) or not obj.cultivar_id:
            return None
        pg = (
            obj.cultivar.porte_greffes.filter(hauteur_max_m__isnull=False)
            .order_by('-hauteur_max_m')
            .first()
        )
        if pg and pg.hauteur_max_m:
            return round(pg.hauteur_max_m * 0.60, 1)
        return None

    def get_pollination_associations(self, obj):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        max_m = get_pollination_distance_max_m(obj.organisme, user)
        out = []
        for membership in obj.pollination_groups.all():
            group = membership.group
            role = membership.role
            other_members = []
            for m in group.members.all():
                if m.specimen_id == obj.id:
                    continue
                spec = m.specimen
                dist = distance_metres_between_specimens(obj, spec)
                alerte_distance = dist is not None and max_m is not None and dist > max_m
                other_members.append({
                    'specimen_id': spec.id,
                    'nom': spec.nom,
                    'organisme_nom': spec.organisme.nom_commun if spec.organisme_id else None,
                    'cultivar_nom': spec.cultivar.nom if getattr(spec, 'cultivar_id', None) and spec.cultivar_id else None,
                    'role': m.role,
                    'statut': spec.statut,
                    'distance_metres': round(dist, 1) if dist is not None else None,
                    'alerte_distance': alerte_distance,
                })
            out.append({
                'group_id': group.id,
                'type_groupe': group.type_groupe,
                'role': role,
                'other_members': other_members,
            })
        return out

    class Meta:
        model = Specimen
        fields = [
            'id', 'nom', 'code_identification', 'nfc_tag_uid', 'organisme', 'organism_calendrier', 'cultivar', 'garden',
            'zone_jardin', 'latitude', 'longitude', 'date_plantation', 'age_plantation',
            'source', 'pepiniere_fournisseur', 'statut', 'sante', 'hauteur_actuelle',
            'premiere_fructification', 'notes', 'date_ajout', 'date_modification', 'is_favori',
            'photo_principale_url', 'photo_principale',
            'pollination_associations', 'rayon_adulte_m',
        ]


class SpecimenCreateUpdateSerializer(serializers.ModelSerializer):
    """Création / mise à jour de spécimen."""

    class Meta:
        model = Specimen
        fields = [
            'id',
            'organisme', 'cultivar', 'garden', 'nom', 'code_identification', 'nfc_tag_uid',
            'zone_jardin', 'latitude', 'longitude', 'date_plantation', 'age_plantation',
            'source', 'pepiniere_fournisseur', 'seed_collection', 'statut', 'sante',
            'hauteur_actuelle', 'premiere_fructification', 'notes',
        ]
        extra_kwargs = {
            'id': {'read_only': True},
            'cultivar': {'required': False, 'allow_null': True},
            'code_identification': {'required': False, 'allow_blank': True},
            'nfc_tag_uid': {'required': False, 'allow_blank': True},
        }

    def validate_code_identification(self, value):
        """Normaliser '' → None pour éviter conflits unique (plusieurs NULL autorisés)."""
        if value is None:
            return None
        s = str(value).strip()
        return s if s else None

    def validate_nfc_tag_uid(self, value):
        """Normaliser '' → None pour éviter conflits unique (plusieurs NULL autorisés)."""
        if value is None:
            return None
        s = str(value).strip()
        return s if s else None


# --- Event ---
class EventSerializer(serializers.ModelSerializer):
    """Événement (journal rapide 2 taps)."""

    class Meta:
        model = Event
        fields = [
            'id', 'type_event', 'date', 'heure', 'titre', 'description',
            'quantite', 'unite', 'amendment', 'produit_utilise',
            'temperature', 'conditions_meteo', 'date_ajout',
        ]
        extra_kwargs = {
            'date': {'required': True},
            'type_event': {'required': True},
        }


class EventCreateSerializer(serializers.ModelSerializer):
    """Création événement (2 taps : type + date auto si non fournie)."""

    class Meta:
        model = Event
        fields = [
            'type_event', 'date', 'heure', 'titre', 'description',
            'quantite', 'unite', 'produit_utilise',
        ]
        extra_kwargs = {
            'date': {'required': False},
            'type_event': {'required': True},
        }

    def create(self, validated_data):
        from datetime import date
        if not validated_data.get('date'):
            validated_data['date'] = date.today()
        validated_data['specimen'] = self.context['specimen']
        return super().create(validated_data)


class EventUpdateSerializer(serializers.ModelSerializer):
    """Mise à jour d'un événement."""

    class Meta:
        model = Event
        fields = [
            'type_event', 'date', 'heure', 'titre', 'description',
            'quantite', 'unite', 'produit_utilise',
        ]
        extra_kwargs = {
            'type_event': {'required': False},
            'date': {'required': False},
        }


class RecentEventSerializer(serializers.Serializer):
    """Événement récent avec infos spécimen et première photo (pour accueil / liste globale)."""
    event_id = serializers.IntegerField(source='id')
    type_event = serializers.CharField()
    date = serializers.DateField()
    titre = serializers.CharField(allow_blank=True, default='')
    specimen_id = serializers.IntegerField()
    specimen_nom = serializers.CharField(source='specimen.nom', allow_blank=True, default='')
    photo_url = serializers.SerializerMethodField()

    def get_photo_url(self, obj):
        try:
            first_photo = getattr(obj, '_first_photo', None) or (obj.photos.first() if hasattr(obj, 'photos') else None)
            if not first_photo or not first_photo.image:
                return None
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_photo.image.url)
            return None
        except Exception:
            return None


# --- Reminder ---
class ReminderSerializer(serializers.ModelSerializer):
    """Rappel (lecture)."""

    class Meta:
        model = Reminder
        fields = [
            'id', 'type_rappel', 'date_rappel', 'type_alerte',
            'titre', 'description', 'recurrence_rule', 'date_ajout',
        ]


class ReminderCreateSerializer(serializers.ModelSerializer):
    """Création de rappel."""

    class Meta:
        model = Reminder
        fields = [
            'type_rappel', 'date_rappel', 'type_alerte',
            'titre', 'description', 'recurrence_rule',
        ]
        extra_kwargs = {
            'type_rappel': {'required': True},
            'date_rappel': {'required': True},
            'type_alerte': {'required': False, 'default': 'popup'},
            'recurrence_rule': {'required': False, 'default': 'none'},
        }

    def create(self, validated_data):
        validated_data['specimen'] = self.context['specimen']
        return super().create(validated_data)


class ReminderUpdateSerializer(serializers.ModelSerializer):
    """Mise à jour d'un rappel (date, récurrence, etc.)."""

    class Meta:
        model = Reminder
        fields = ['type_rappel', 'date_rappel', 'type_alerte', 'titre', 'description', 'recurrence_rule']
        extra_kwargs = {
            'type_rappel': {'required': False},
            'date_rappel': {'required': False},
            'recurrence_rule': {'required': False},
        }


# --- Photo ---
class PhotoSerializer(serializers.ModelSerializer):
    """Photo (lecture). Inclut event_id et event (résumé) si la photo est liée à un événement."""

    image_url = serializers.SerializerMethodField()
    event_id = serializers.SerializerMethodField()
    event = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = [
            'id', 'image', 'image_url', 'type_photo', 'titre', 'description',
            'date_prise', 'date_ajout',
            'source_url', 'source_author', 'source_license',
            'event_id', 'event',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_event_id(self, obj):
        return obj.event_id if obj.event_id else None

    def get_event(self, obj):
        if not obj.event_id or not obj.event:
            return None
        e = obj.event
        return {
            'id': e.id,
            'type_event': e.type_event,
            'date': e.date.isoformat() if e.date else None,
            'titre': e.titre or '',
        }


class PhotoCreateSerializer(serializers.ModelSerializer):
    """Upload de photo (specimen ou event)."""

    class Meta:
        model = Photo
        fields = ['image', 'type_photo', 'titre', 'description', 'date_prise']
        extra_kwargs = {
            'image': {'required': True},
        }


# --- SpecimenGroup (groupes de pollinisation) ---
class SpecimenGroupMemberReadSerializer(serializers.ModelSerializer):
    """Membre d'un groupe (lecture)."""
    specimen_id = serializers.IntegerField(source='specimen.id', read_only=True)
    specimen_nom = serializers.CharField(source='specimen.nom', read_only=True)
    organisme_nom = serializers.CharField(source='specimen.organisme.nom_commun', read_only=True)

    class Meta:
        model = SpecimenGroupMember
        fields = ['id', 'specimen_id', 'specimen_nom', 'organisme_nom', 'role']


class SpecimenGroupSerializer(serializers.ModelSerializer):
    """Groupe de pollinisation (lecture + écriture)."""
    members = SpecimenGroupMemberReadSerializer(many=True, read_only=True)

    class Meta:
        model = SpecimenGroup
        fields = ['id', 'type_groupe', 'organisme', 'date_ajout', 'members']
        read_only_fields = ['date_ajout']


class SpecimenGroupMemberWriteSerializer(serializers.ModelSerializer):
    """Ajout d'un membre à un groupe."""
    class Meta:
        model = SpecimenGroupMember
        fields = ['specimen', 'role']


class SpecimenGroupCreateUpdateSerializer(serializers.ModelSerializer):
    """Création / mise à jour d'un groupe (sans les membres)."""
    class Meta:
        model = SpecimenGroup
        fields = ['type_groupe', 'organisme']


# --- UserTag (pour organismes, optionnel) ---
class UserTagSerializer(serializers.ModelSerializer):
    """Tags personnels."""

    class Meta:
        model = UserTag
        fields = ['id', 'nom', 'couleur', 'description']
