"""
Serializers pour l'API REST (app mobile Jardin Biot).
"""
from rest_framework import serializers

from .models import Organism, Garden, Specimen, SpecimenFavorite, OrganismFavorite, Event, Photo, UserTag
from .source_rules import (
    find_organism_by_latin_fuzzy,
    find_organism_by_common_name,
    normalize_latin_name,
)


# --- Organism (lecture pour choix espèce) ---
class OrganismMinimalSerializer(serializers.ModelSerializer):
    """Minimal pour listes et choix."""
    is_favori = serializers.SerializerMethodField()

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return OrganismFavorite.objects.filter(user=request.user, organism=obj).exists()

    class Meta:
        model = Organism
        fields = ['id', 'nom_commun', 'nom_latin', 'type_organisme', 'is_favori']


class OrganismDetailSerializer(serializers.ModelSerializer):
    """Détail complet pour affichage et édition."""
    is_favori = serializers.SerializerMethodField()

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return OrganismFavorite.objects.filter(user=request.user, organism=obj).exists()

    class Meta:
        model = Organism
        fields = [
            'id', 'nom_commun', 'nom_latin', 'famille', 'regne', 'type_organisme', 'is_favori',
            'besoin_eau', 'besoin_soleil', 'zone_rusticite', 'sol_drainage', 'sol_richesse',
            'hauteur_max', 'largeur_max', 'vitesse_croissance',
            'comestible', 'parties_comestibles', 'toxicite',
            'type_noix', 'age_fructification', 'periode_recolte', 'pollinisation', 'production_annuelle',
            'fixateur_azote', 'accumulateur_dynamique', 'mellifere', 'produit_juglone', 'indigene',
            'description', 'notes', 'usages_autres',
        ]


class OrganismUpdateSerializer(serializers.ModelSerializer):
    """Pour mettre à jour une espèce depuis l'app mobile."""

    class Meta:
        model = Organism
        fields = [
            'nom_commun', 'nom_latin', 'famille', 'regne', 'type_organisme',
            'besoin_eau', 'besoin_soleil', 'sol_drainage', 'sol_richesse',
            'hauteur_max', 'largeur_max', 'vitesse_croissance',
            'comestible', 'parties_comestibles', 'toxicite',
            'type_noix', 'age_fructification', 'periode_recolte', 'pollinisation', 'production_annuelle',
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


# --- Specimen ---
class SpecimenListSerializer(serializers.ModelSerializer):
    """Liste des spécimens avec organisme et statut."""

    organisme_nom = serializers.CharField(source='organisme.nom_commun', read_only=True)
    organisme_nom_latin = serializers.CharField(source='organisme.nom_latin', read_only=True)
    garden_nom = serializers.SerializerMethodField()
    is_favori = serializers.SerializerMethodField()

    def get_garden_nom(self, obj):
        return obj.garden.nom if obj.garden else None

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return SpecimenFavorite.objects.filter(user=request.user, specimen=obj).exists()

    class Meta:
        model = Specimen
        fields = [
            'id', 'nom', 'code_identification', 'nfc_tag_uid', 'organisme', 'organisme_nom',
            'organisme_nom_latin', 'garden', 'garden_nom', 'zone_jardin', 'statut', 'sante',
            'date_plantation', 'latitude', 'longitude', 'is_favori',
        ]


class SpecimenDetailSerializer(serializers.ModelSerializer):
    """Détail complet d'un spécimen."""

    organisme = OrganismMinimalSerializer(read_only=True)
    garden = GardenMinimalSerializer(read_only=True, allow_null=True)
    is_favori = serializers.SerializerMethodField()

    def get_is_favori(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return SpecimenFavorite.objects.filter(user=request.user, specimen=obj).exists()

    class Meta:
        model = Specimen
        fields = [
            'id', 'nom', 'code_identification', 'nfc_tag_uid', 'organisme', 'garden',
            'zone_jardin', 'latitude', 'longitude', 'date_plantation', 'age_plantation',
            'source', 'pepiniere_fournisseur', 'statut', 'sante', 'hauteur_actuelle',
            'premiere_fructification', 'notes', 'date_ajout', 'date_modification', 'is_favori',
        ]


class SpecimenCreateUpdateSerializer(serializers.ModelSerializer):
    """Création / mise à jour de spécimen."""

    class Meta:
        model = Specimen
        fields = [
            'organisme', 'garden', 'nom', 'code_identification', 'nfc_tag_uid',
            'zone_jardin', 'latitude', 'longitude', 'date_plantation', 'age_plantation',
            'source', 'pepiniere_fournisseur', 'seed_collection', 'statut', 'sante',
            'hauteur_actuelle', 'premiere_fructification', 'notes',
        ]
        extra_kwargs = {
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


# --- Photo ---
class PhotoSerializer(serializers.ModelSerializer):
    """Photo (lecture)."""

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = [
            'id', 'image', 'image_url', 'type_photo', 'titre', 'description',
            'date_prise', 'date_ajout',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class PhotoCreateSerializer(serializers.ModelSerializer):
    """Upload de photo (specimen ou event)."""

    class Meta:
        model = Photo
        fields = ['image', 'type_photo', 'titre', 'description', 'date_prise']
        extra_kwargs = {
            'image': {'required': True},
        }


# --- UserTag (pour organismes, optionnel) ---
class UserTagSerializer(serializers.ModelSerializer):
    """Tags personnels."""

    class Meta:
        model = UserTag
        fields = ['id', 'nom', 'couleur', 'description']
