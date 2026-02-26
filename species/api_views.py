"""
Vues API REST pour l'app mobile Jardin Biot.
Endpoints: specimens, events, reminders, photos, organisms, gardens, NFC lookup.
"""
from datetime import date, timedelta
from math import radians, sin, cos, sqrt, atan2

from django.db.models import Q
from rest_framework import status, viewsets, mixins
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Organism, Garden, Specimen, SpecimenFavorite, OrganismFavorite, Event, Reminder, Photo, UserPreference
from .serializers import (
    OrganismMinimalSerializer,
    OrganismDetailSerializer,
    OrganismCreateSerializer,
    OrganismUpdateSerializer,
    GardenMinimalSerializer,
    SpecimenListSerializer,
    SpecimenDetailSerializer,
    SpecimenCreateUpdateSerializer,
    EventSerializer,
    EventCreateSerializer,
    EventUpdateSerializer,
    ReminderSerializer,
    ReminderCreateSerializer,
    ReminderUpdateSerializer,
    PhotoSerializer,
    PhotoCreateSerializer,
)


# --- NFC lookup (priorité : sans auth pour scan rapide en terrain ? Non, garder auth) ---
class SpecimenByNfcView(APIView):
    """
    Résolution NFC/RFID : UID → spécimen.
    GET /api/specimens/by-nfc/<uid>/
    Cherche d'abord nfc_tag_uid, puis code_identification (rétrocompat).
    """

    def get(self, request, uid):
        uid_clean = (uid or '').strip().upper()
        if not uid_clean:
            return Response({'detail': 'UID requis'}, status=status.HTTP_400_BAD_REQUEST)

        specimen = (
            Specimen.objects.filter(nfc_tag_uid__iexact=uid_clean).first()
            or Specimen.objects.filter(code_identification__iexact=uid_clean).first()
        )
        if not specimen:
            return Response({'detail': 'Aucun spécimen associé à ce tag'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SpecimenDetailSerializer(specimen, context={'request': request})
        return Response(serializer.data)


# --- Specimen ViewSet ---
class SpecimenViewSet(viewsets.ModelViewSet):
    """CRUD spécimens + liste avec filtres."""

    queryset = Specimen.objects.select_related(
        'organisme', 'garden', 'photo_principale'
    ).prefetch_related('photos').order_by('-date_plantation', 'nom')

    def get_serializer_class(self):
        if self.action in ('list',):
            return SpecimenListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return SpecimenCreateUpdateSerializer
        return SpecimenDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        garden_id = self.request.query_params.get('garden')
        if garden_id:
            qs = qs.filter(garden_id=garden_id)
        zone = self.request.query_params.get('zone')
        if zone:
            qs = qs.filter(zone_jardin__icontains=zone)
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        organisme_id = self.request.query_params.get('organisme')
        if organisme_id:
            qs = qs.filter(organisme_id=organisme_id)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(nom__icontains=search)
                | Q(code_identification__icontains=search)
                | Q(organisme__nom_commun__icontains=search)
            )
        favoris = self.request.query_params.get('favoris')
        if favoris and self.request.user.is_authenticated:
            fav_ids = SpecimenFavorite.objects.filter(user=self.request.user).values_list('specimen_id', flat=True)
            qs = qs.filter(pk__in=fav_ids)
        sante = self.request.query_params.get('sante')
        if sante:
            try:
                sante_val = int(sante)
                qs = qs.filter(sante=sante_val)
            except ValueError:
                pass
        return qs

    @action(detail=False, methods=['get'], url_path='zones')
    def zones(self, request):
        """Returns distinct zone_jardin values from specimens."""
        zones = (
            Specimen.objects.exclude(zone_jardin__isnull=True)
            .exclude(zone_jardin='')
            .values_list('zone_jardin', flat=True)
            .distinct()
            .order_by('zone_jardin')
        )
        return Response(list(zones))

    @action(detail=False, methods=['get'], url_path='nearby')
    def nearby(self, request):
        """
        Spécimens à proximité d'une position GPS.
        Query params: lat, lng (requis), radius (mètres, défaut 500), limit (défaut 50).
        Retourne la liste triée par distance avec distance_km sur chaque item.
        """
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if not lat or not lng:
            return Response(
                {'detail': 'Paramètres lat et lng requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            lat_f = float(lat)
            lng_f = float(lng)
        except ValueError:
            return Response(
                {'detail': 'lat et lng doivent être des nombres'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        radius_m = 1000.0  # 1 km par défaut (couvre vergers, forêts comestibles)
        if 'radius' in request.query_params:
            try:
                radius_m = float(request.query_params.get('radius'))
            except (ValueError, TypeError):
                pass
        limit = 50
        if 'limit' in request.query_params:
            try:
                limit = int(request.query_params.get('limit'))
            except (ValueError, TypeError):
                pass

        def haversine_km(lat1, lon1, lat2, lon2):
            R = 6371  # Rayon Terre en km
            lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return R * c

        specimens = list(
            Specimen.objects.filter(
                latitude__isnull=False,
                longitude__isnull=False,
            )
            .select_related('organisme', 'garden', 'photo_principale')
            .prefetch_related('photos')
        )
        with_dist = [
            (s, haversine_km(lat_f, lng_f, s.latitude, s.longitude))
            for s in specimens
        ]
        with_dist = [(s, d) for s, d in with_dist if d * 1000 <= radius_m]
        with_dist.sort(key=lambda x: x[1])
        with_dist = with_dist[:limit]

        serializer = SpecimenListSerializer(
            [s for s, _ in with_dist],
            many=True,
            context={'request': request},
        )
        data = serializer.data
        for i, (_, dist) in enumerate(with_dist):
            data[i]['distance_km'] = round(dist, 4)
        return Response(data)

    @action(detail=True, methods=['post', 'delete'], url_path='favoris')
    def favoris(self, request, pk=None):
        """POST = add favorite, DELETE = remove favorite."""
        specimen = self.get_object()
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        if request.method == 'POST':
            SpecimenFavorite.objects.get_or_create(user=request.user, specimen=specimen)
            return Response({'detail': 'Ajouté aux favoris'}, status=status.HTTP_200_OK)
        SpecimenFavorite.objects.filter(user=request.user, specimen=specimen).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get', 'post'])
    def reminders(self, request, pk=None):
        """GET/POST rappels du spécimen."""
        specimen = self.get_object()
        if request.method == 'GET':
            reminders = specimen.rappels.order_by('date_rappel', 'date_ajout')[:50]
            serializer = ReminderSerializer(reminders, many=True)
            return Response(serializer.data)
        serializer = ReminderCreateSerializer(
            data=request.data,
            context={'specimen': specimen},
        )
        serializer.is_valid(raise_exception=True)
        reminder = serializer.save(specimen=specimen)
        return Response(ReminderSerializer(reminder).data, status=status.HTTP_201_CREATED)

    # Mapping type_rappel -> type_event pour "marquer comme complété"
    REMINDER_TO_EVENT_TYPE = {
        'arrosage': 'arrosage',
        'suivi_maladie': 'maladie',
        'taille': 'taille',
        'suivi_general': 'observation',
        'cueillette': 'recolte',
    }

    @action(detail=True, methods=['get', 'patch', 'delete'], url_path='reminders/(?P<reminder_pk>[^/.]+)')
    def reminder_detail(self, request, pk=None, reminder_pk=None):
        """GET/PATCH/DELETE un rappel spécifique."""
        specimen = self.get_object()
        reminder = get_object_or_404(Reminder, pk=reminder_pk, specimen=specimen)
        if request.method == 'GET':
            serializer = ReminderSerializer(reminder)
            return Response(serializer.data)
        if request.method == 'DELETE':
            reminder.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = ReminderUpdateSerializer(reminder, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ReminderSerializer(reminder).data)

    @action(detail=True, methods=['post'], url_path='reminders/(?P<reminder_pk>[^/.]+)/complete')
    def reminder_complete(self, request, pk=None, reminder_pk=None):
        """
        Marquer le rappel comme complété : crée un événement, optionnellement le prochain rappel si récurrent, supprime le rappel.
        Body optionnel: { "create_next": true } pour forcer la création du prochain (ou si récurrent, fait automatiquement).
        """
        specimen = self.get_object()
        reminder = get_object_or_404(Reminder, pk=reminder_pk, specimen=specimen)
        today = date.today()
        type_event = self.REMINDER_TO_EVENT_TYPE.get(reminder.type_rappel, 'observation')
        Event.objects.create(
            specimen=specimen,
            type_event=type_event,
            date=today,
            titre=reminder.titre or '',
            description=reminder.description or '',
        )
        create_next = reminder.recurrence_rule and reminder.recurrence_rule != 'none'
        if create_next or request.data.get('create_next'):
            rule = reminder.recurrence_rule or 'none'
            if rule == 'biweekly':
                next_date = today + timedelta(days=14)
            elif rule == 'annual':
                next_date = today.replace(year=today.year + 1)
            elif rule == 'biannual':
                month = today.month + 6
                year = today.year
                if month > 12:
                    month -= 12
                    year += 1
                try:
                    next_date = date(year, month, min(today.day, 28))
                except ValueError:
                    next_date = date(year, month, 28)
            else:
                next_date = None
            if next_date:
                Reminder.objects.create(
                    specimen=specimen,
                    type_rappel=reminder.type_rappel,
                    date_rappel=next_date,
                    type_alerte=reminder.type_alerte,
                    titre=reminder.titre or '',
                    description=reminder.description or '',
                    recurrence_rule=reminder.recurrence_rule or 'none',
                )
        reminder.delete()
        return Response({'detail': 'Rappel complété, événement créé.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post'])
    def events(self, request, pk=None):
        """GET/POST événements du spécimen."""
        specimen = self.get_object()
        if request.method == 'GET':
            events = specimen.evenements.order_by('-date', '-heure')[:50]
            serializer = EventSerializer(events, many=True)
            return Response(serializer.data)
        serializer = EventCreateSerializer(
            data=request.data,
            context={'specimen': specimen, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(EventSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'patch', 'delete'], url_path='events/(?P<event_pk>[^/.]+)')
    def event_detail(self, request, pk=None, event_pk=None):
        """GET/PATCH/DELETE un événement spécifique."""
        specimen = self.get_object()
        event = get_object_or_404(Event, pk=event_pk, specimen=specimen)
        if request.method == 'GET':
            serializer = EventSerializer(event)
            return Response(serializer.data)
        if request.method == 'DELETE':
            event.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = EventUpdateSerializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(EventSerializer(serializer.instance).data)

    @action(detail=True, methods=['get'], url_path='events/(?P<event_pk>[^/.]+)/apply-to-zone-preview')
    def event_apply_to_zone_preview(self, request, pk=None, event_pk=None):
        """Retourne le nombre de spécimens dans la même zone (pour afficher le bouton)."""
        specimen = self.get_object()
        event = get_object_or_404(Event, pk=event_pk, specimen=specimen)
        if not specimen.zone_jardin or not specimen.zone_jardin.strip():
            return Response({'zone': None, 'count': 0})
        zone = specimen.zone_jardin.strip()
        count = Specimen.objects.filter(
            garden=specimen.garden,
            zone_jardin__iexact=zone,
        ).exclude(pk=specimen.pk).count()
        return Response({'zone': zone, 'count': count})

    @action(detail=True, methods=['post'], url_path='events/(?P<event_pk>[^/.]+)/apply-to-zone')
    def event_apply_to_zone(self, request, pk=None, event_pk=None):
        """Applique un événement à tous les spécimens de la même zone (même garden + zone_jardin)."""
        specimen = self.get_object()
        event = get_object_or_404(Event, pk=event_pk, specimen=specimen)
        if not specimen.zone_jardin or not specimen.zone_jardin.strip():
            return Response(
                {'detail': 'Ce spécimen n\'a pas de zone définie.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        zone = specimen.zone_jardin.strip()
        targets = Specimen.objects.filter(
            garden=specimen.garden,
            zone_jardin__iexact=zone,
        ).exclude(pk=specimen.pk)
        created = 0
        for target in targets:
            Event.objects.create(
                specimen=target,
                type_event=event.type_event,
                date=event.date,
                heure=event.heure,
                titre=event.titre or '',
                description=event.description or '',
                quantite=event.quantite,
                unite=event.unite or '',
                produit_utilise=event.produit_utilise or '',
            )
            created += 1
        return Response({'created': created, 'zone': zone}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post'], url_path='events/(?P<event_pk>[^/.]+)/photos')
    def event_photos(self, request, pk=None, event_pk=None):
        """GET/POST photos liées à un événement."""
        specimen = self.get_object()
        event = get_object_or_404(Event, pk=event_pk, specimen=specimen)
        if request.method == 'GET':
            photos_qs = Photo.objects.filter(event=event).order_by('-date_prise', '-date_ajout')
            serializer = PhotoSerializer(photos_qs, many=True, context={'request': request})
            return Response(serializer.data)
        serializer = PhotoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = serializer.save(specimen=specimen, event=event)
        return Response(
            PhotoSerializer(photo, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get', 'post'])
    def photos(self, request, pk=None):
        """GET/POST photos du spécimen."""
        specimen = self.get_object()
        if request.method == 'GET':
            photos_qs = Photo.objects.filter(specimen=specimen).order_by('-date_prise', '-date_ajout')
            serializer = PhotoSerializer(photos_qs, many=True, context={'request': request})
            return Response(serializer.data)
        serializer = PhotoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = serializer.save(specimen=specimen)
        return Response(
            PhotoSerializer(photo, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['delete'], url_path='photos/(?P<photo_pk>[^/.]+)')
    def photo_detail(self, request, pk=None, photo_pk=None):
        """DELETE une photo du spécimen."""
        specimen = self.get_object()
        photo = get_object_or_404(Photo, pk=photo_pk, specimen=specimen)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='photos/(?P<photo_pk>[^/.]+)/set-default')
    def photo_set_default(self, request, pk=None, photo_pk=None):
        """Définit cette photo comme photo par défaut du spécimen."""
        specimen = self.get_object()
        photo = get_object_or_404(Photo, pk=photo_pk, specimen=specimen)
        specimen.photo_principale = photo
        specimen.save(update_fields=['photo_principale', 'date_modification'])
        return Response({'detail': 'Photo par défaut définie'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """POST /api/specimens/{id}/duplicate/ → crée une copie avec les mêmes données (sans tag/code)."""
        specimen = self.get_object()
        data = {
            'organisme': specimen.organisme_id,
            'garden': specimen.garden_id,
            'nom': f"{specimen.nom} (copie)",
            'zone_jardin': specimen.zone_jardin,
            'latitude': specimen.latitude,
            'longitude': specimen.longitude,
            'date_plantation': specimen.date_plantation,
            'age_plantation': specimen.age_plantation,
            'source': specimen.source,
            'pepiniere_fournisseur': specimen.pepiniere_fournisseur,
            'seed_collection': specimen.seed_collection_id,
            'statut': specimen.statut,
            'sante': specimen.sante,
            'hauteur_actuelle': specimen.hauteur_actuelle,
            'premiere_fructification': specimen.premiere_fructification,
            'notes': specimen.notes,
        }
        serializer = SpecimenCreateUpdateSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        new_specimen = serializer.save()
        output = SpecimenDetailSerializer(new_specimen, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)


class OrganismPagination(PageNumberPagination):
    """50 espèces par page pour infinite scroll."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


# --- Organism ViewSet (lecture + création + mise à jour) ---
class OrganismViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Liste, détail, création et mise à jour des organismes (espèces)."""

    queryset = Organism.objects.order_by('nom_commun')
    pagination_class = OrganismPagination

    def get_serializer_class(self):
        if self.action == 'create':
            return OrganismCreateSerializer
        if self.action in ('update', 'partial_update'):
            return OrganismUpdateSerializer
        if self.action == 'retrieve':
            return OrganismDetailSerializer
        return OrganismMinimalSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action == 'create' and self.request:
            context['force_create'] = self.request.data.get('force_create', False)
        return context

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(nom_commun__icontains=search) | Q(nom_latin__icontains=search)
            )
        type_org = self.request.query_params.get('type')
        if type_org:
            qs = qs.filter(type_organisme=type_org)
        favoris = self.request.query_params.get('favoris')
        if favoris and self.request.user.is_authenticated:
            fav_ids = OrganismFavorite.objects.filter(user=self.request.user).values_list('organism_id', flat=True)
            qs = qs.filter(pk__in=fav_ids)
        soleil = self.request.query_params.get('soleil')
        if soleil:
            qs = qs.filter(besoin_soleil=soleil)
        zone_usda = self.request.query_params.get('zone_usda')
        if zone_usda:
            try:
                z = int(zone_usda)
                q_zone = Q()
                for i in range(1, min(z + 1, 14)):
                    for s in ('a', 'b'):
                        q_zone |= Q(zone_rusticite__icontains=f'"zone": "{i}{s}"')
                    q_zone |= Q(zone_rusticite__icontains=f'"zone": "{i}"')
                qs = qs.filter(q_zone)
            except ValueError:
                pass
        fruits = self.request.query_params.get('fruits')
        if fruits:
            qs = qs.filter(
                type_organisme__in=['arbre_fruitier', 'arbuste_fruitier', 'arbuste_baies']
            )
        noix = self.request.query_params.get('noix')
        if noix:
            qs = qs.filter(type_organisme='arbre_noix')
        return qs

    @action(detail=True, methods=['post', 'delete'], url_path='favoris')
    def favoris(self, request, pk=None):
        """POST = add favorite, DELETE = remove favorite."""
        organism = self.get_object()
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        if request.method == 'POST':
            OrganismFavorite.objects.get_or_create(user=request.user, organism=organism)
            return Response({'detail': 'Ajouté aux favoris'}, status=status.HTTP_200_OK)
        OrganismFavorite.objects.filter(user=request.user, organism=organism).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, url_path='inconnu')
    def inconnu(self, request):
        """Organisme système pour observations rapides (espèce non identifiée)."""
        org = Organism.objects.filter(nom_commun='Espèce non identifiée').first()
        if not org:
            return Response(
                {'detail': 'Organisme "Espèce non identifiée" introuvable. Exécutez les migrations.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = OrganismMinimalSerializer(org)
        return Response(serializer.data)


# --- Garden ViewSet (lecture) ---
class GardenViewSet(viewsets.ReadOnlyModelViewSet):
    """Liste et détail des jardins."""

    queryset = Garden.objects.order_by('nom')
    serializer_class = GardenMinimalSerializer


# --- Préférences utilisateur (jardin par défaut) ---
class UserPreferencesView(APIView):
    """
    GET /api/me/preferences/  -> { "default_garden_id": int | null }
    PATCH /api/me/preferences/ -> body { "default_garden_id": int | null }
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        prefs, _ = UserPreference.objects.get_or_create(user=request.user, defaults={})
        return Response({
            'default_garden_id': prefs.default_garden_id,
        })

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        prefs, _ = UserPreference.objects.get_or_create(user=request.user, defaults={})
        gid = request.data.get('default_garden_id')
        if gid is None:
            prefs.default_garden_id = None
        else:
            if not Garden.objects.filter(pk=gid).exists():
                return Response(
                    {'detail': 'Jardin introuvable.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            prefs.default_garden_id = gid
        prefs.save()
        return Response({'default_garden_id': prefs.default_garden_id})


# --- Rappels à venir (page d'accueil) ---
def _reminder_to_upcoming_item(r, request, today):
    """Build one reminder payload with is_overdue and specimen info."""
    s = r.specimen
    photo_url = None
    if s.photo_principale and s.photo_principale.image and request:
        photo_url = request.build_absolute_uri(s.photo_principale.image.url)
    else:
        photos = list(s.photos.all())
        if photos and photos[0].image and request:
            photo_url = request.build_absolute_uri(photos[0].image.url)
    return {
        'id': r.id,
        'type_rappel': r.type_rappel,
        'date_rappel': str(r.date_rappel),
        'type_alerte': r.type_alerte,
        'titre': r.titre or '',
        'description': r.description or '',
        'is_overdue': r.date_rappel < today,
        'recurrence_rule': getattr(r, 'recurrence_rule', 'none') or 'none',
        'specimen': {
            'id': s.id,
            'nom': s.nom,
            'organisme_nom': s.organisme.nom_commun,
            'photo_url': photo_url,
        },
    }


class RemindersUpcomingView(APIView):
    """
    GET /api/reminders/upcoming/
    Retourne les rappels (passés et à venir) pour les spécimens favoris.
    Inclut is_overdue=True si date_rappel < aujourd'hui.
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        today = date.today()
        fav_ids = SpecimenFavorite.objects.filter(user=request.user).values_list('specimen_id', flat=True)
        reminders = (
            Reminder.objects.filter(specimen_id__in=fav_ids)
            .select_related('specimen', 'specimen__organisme', 'specimen__photo_principale')
            .prefetch_related('specimen__photos')
            .order_by('date_rappel', 'date_ajout')[:30]
        )
        result = [_reminder_to_upcoming_item(r, request, today) for r in reminders]
        return Response(result)


# --- Alertes météo (page d'accueil) ---
class WeatherAlertsView(APIView):
    """
    GET /api/weather-alerts/
    Retourne les alertes météo pour les jardins ayant des spécimens.
    a) Pas de pluie depuis longtemps → icône avertissement
    b) Gel prévu ou survenu → icône flocon
    c) Température élevée prévue → icône canicule (seuil configurable admin)
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        from .weather_service import (
            fetch_forecast,
            get_forecast_alerts,
            get_watering_alert,
        )
        gardens = Garden.objects.filter(
            latitude__isnull=False,
            longitude__isnull=False,
        ).filter(specimens__isnull=False).distinct()
        alerts = []
        for g in gardens:
            # Alerte arrosage (chaud + sec)
            watering = get_watering_alert(g)
            if watering:
                alerts.append({
                    'type': 'no_rain',
                    'icon': 'warning',
                    'message': watering['message'],
                    'garden_nom': g.nom,
                })
            # Prévisions et alertes
            forecast = fetch_forecast(g, days=7)
            forecast_alerts = get_forecast_alerts(g, forecast)
            for fa in forecast_alerts:
                icon = 'warning'
                if fa.get('type') == 'frost_risk':
                    icon = 'snowflake'
                elif fa.get('type') == 'high_temp_forecast':
                    icon = 'thermometer'
                elif fa.get('type') == 'no_rain_forecast':
                    icon = 'water'
                alerts.append({
                    'type': fa.get('type', 'info'),
                    'icon': icon,
                    'message': fa.get('message', ''),
                    'garden_nom': g.nom,
                })
        return Response(alerts[:20])  # Limite pour éviter trop d'alertes