"""
Vues API REST pour l'app mobile Jardin Biot.
Endpoints: specimens, events, reminders, photos, organisms, gardens, NFC lookup.
"""
import re
from datetime import date, timedelta
from math import radians, sin, cos, sqrt, atan2

import csv
import io

import requests
from django.core.files.base import ContentFile
from django.db import connection
from django.db.models import Exists, F, OuterRef, Q
from django.http import HttpResponse
from rest_framework import status, viewsets, mixins
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from gardens.models import GardenGCP, Partner, Zone
from .models import (
    Cultivar,
    CultivarPorteGreffe,
    Organism,
    OrganismCalendrier,
    Garden,
    Specimen,
    SpecimenFavorite,
    OrganismFavorite,
    SpecimenGroup,
    SpecimenGroupMember,
    Event,
    Reminder,
    Photo,
    UserPreference,
)
from django.db.models import Prefetch

from .serializers import (
    CultivarListSerializer,
    CultivarSerializer,
    OrganismMinimalSerializer,
    OrganismDetailSerializer,
    OrganismCreateSerializer,
    OrganismUpdateSerializer,
    GardenMinimalSerializer,
    GardenCreateSerializer,
    GardenUpdateSerializer,
    GardenGCPSerializer,
    PartnerSerializer,
    ZoneSerializer,
    SpecimenListSerializer,
    SpecimenDetailSerializer,
    SpecimenCreateUpdateSerializer,
    SpecimenGroupSerializer,
    SpecimenGroupCreateUpdateSerializer,
    SpecimenGroupMemberWriteSerializer,
    EventSerializer,
    EventCreateSerializer,
    EventUpdateSerializer,
    RecentEventSerializer,
    ReminderSerializer,
    ReminderCreateSerializer,
    ReminderUpdateSerializer,
    PhotoSerializer,
    PhotoCreateSerializer,
)


def _invalidate_warnings_cache_for_garden(garden_id):
    """Invalide le cache des warnings d'un jardin (après création/suppression spécimen, rappel, etc.)."""
    if garden_id is None:
        return
    from django.core.cache import cache
    cache.delete(f'warnings_{garden_id}')


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
        'organisme', 'cultivar', 'garden', 'photo_principale'
    ).prefetch_related('photos', 'cultivar__porte_greffes').order_by('-date_plantation', 'nom')

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
        # Par défaut, exclure les spécimens enlevés sauf si include_enleve=true
        if not statut:
            include_enleve = self.request.query_params.get('include_enleve', 'false').lower() == 'true'
            if not include_enleve:
                qs = qs.exclude(statut='enleve')
        if self.action == 'retrieve':
            qs = qs.prefetch_related(
                'organisme__calendrier',
                Prefetch(
                    'pollination_groups',
                    queryset=SpecimenGroupMember.objects.select_related('group').prefetch_related(
                        'group__members__specimen',
                        'group__members__specimen__organisme',
                        'group__members__specimen__cultivar',
                    ),
                ),
            )
        return qs

    def perform_create(self, serializer):
        serializer.save()
        _invalidate_warnings_cache_for_garden(serializer.instance.garden_id)

    def perform_destroy(self, instance):
        garden_id = instance.garden_id
        super().perform_destroy(instance)
        _invalidate_warnings_cache_for_garden(garden_id)

    def perform_update(self, serializer):
        old_garden_id = serializer.instance.garden_id if serializer.instance.pk else None
        super().perform_update(serializer)
        new_garden_id = serializer.instance.garden_id
        if old_garden_id != new_garden_id:
            _invalidate_warnings_cache_for_garden(old_garden_id)
            _invalidate_warnings_cache_for_garden(new_garden_id)

    @action(detail=False, methods=['get'], url_path='recent_events')
    def recent_events(self, request):
        """GET /api/specimens/recent_events/?limit=20 — Derniers événements (tous spécimens), avec specimen et photo."""
        specimen_qs = self.get_queryset()
        try:
            limit = min(int(request.query_params.get('limit', 20)), 100)
        except ValueError:
            limit = 20
        events_qs = (
            Event.objects.filter(specimen__in=specimen_qs)
            .select_related('specimen')
            .prefetch_related(
                Prefetch('photos', queryset=Photo.objects.order_by('-date_prise', '-date_ajout'))
            )
            .order_by('-date', '-id')[:limit]
        )
        serializer = RecentEventSerializer(
            events_qs,
            many=True,
            context={'request': request},
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='count')
    def count(self, request):
        """GET /api/specimens/count/?... Retourne { count } avec les mêmes filtres que la liste."""
        qs = self.get_queryset()
        return Response({'count': qs.count()})

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

    @action(detail=True, methods=['get'], url_path='companions')
    def companions(self, request, pk=None):
        """GET /api/specimens/<id>/companions/ — Compagnonnage (bénéficie de / aide à)."""
        specimen = self.get_object()
        from .companion import compute_specimen_companions
        data = compute_specimen_companions(specimen.id)
        return Response(data)

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
        _invalidate_warnings_cache_for_garden(specimen.garden_id)
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
        _invalidate_warnings_cache_for_garden(specimen.garden_id)
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
            photos_qs = Photo.objects.filter(event=event).select_related('event').order_by('-date_prise', '-date_ajout')
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
            photos_qs = Photo.objects.filter(specimen=specimen).select_related('event').order_by('-date_prise', '-date_ajout')
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
        qs = super().get_queryset().prefetch_related('photos', 'noms')
        search = self.request.query_params.get('search')
        use_search_rank = False
        if search:
            search = search.strip()
        if search:
            if connection.vendor == 'postgresql' and hasattr(Organism, 'search_vector'):
                from django.contrib.postgres.search import SearchQuery, SearchRank
                sq = SearchQuery(search, config='simple')
                qs = qs.filter(search_vector__isnull=False).filter(search_vector=sq)
                qs = qs.annotate(rank=SearchRank(F('search_vector'), sq))
                use_search_rank = True
            else:
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
        vigueur = self.request.query_params.get('vigueur')
        if vigueur and vigueur in ('nain', 'semi_nain', 'semi_vigoureux', 'vigoureux', 'standard'):
            qs = qs.filter(cultivars__porte_greffes__vigueur=vigueur).distinct()
        has_specimen = self.request.query_params.get('has_specimen')
        garden_id = self.request.query_params.get('garden')
        if has_specimen:
            specimen_filter = Specimen.objects.all()
            if garden_id:
                try:
                    specimen_filter = specimen_filter.filter(garden_id=int(garden_id))
                except (ValueError, TypeError):
                    pass
            org_ids = specimen_filter.values_list('organisme_id', flat=True).distinct()
            qs = qs.filter(pk__in=org_ids)
        qs = qs.select_related('photo_principale')
        if self.action == 'list':
            qs = qs.annotate(
                has_availability=Exists(
                    CultivarPorteGreffe.objects.filter(
                        cultivar__organism=OuterRef('pk')
                    ).exclude(disponible_chez=[])
                )
            )
        if self.action == 'list':
            if use_search_rank:
                qs = qs.order_by('-rank', 'genus', 'nom_commun')
            else:
                qs = qs.order_by('genus', 'nom_commun')
        if self.action == 'retrieve':
            from .models import CompanionRelation, Cultivar, CultivarPollinator
            qs = qs.prefetch_related(
                'noms',
                'proprietes',
                'usages',
                'calendrier',
                Prefetch(
                    'cultivars',
                    queryset=Cultivar.objects.prefetch_related(
                        'porte_greffes',
                        Prefetch(
                            'pollinator_companions',
                            queryset=CultivarPollinator.objects.select_related(
                                'companion_cultivar', 'companion_organism'
                            ),
                        )
                    ),
                ),
                Prefetch(
                    'relations_sortantes',
                    queryset=CompanionRelation.objects.select_related('organisme_cible'),
                ),
                Prefetch(
                    'relations_entrantes',
                    queryset=CompanionRelation.objects.select_related('organisme_source'),
                ),
            )
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

    @action(detail=False, methods=['get'], url_path='count')
    def count(self, request):
        """GET /api/organisms/count/?... Retourne { count } avec les mêmes filtres que la liste."""
        qs = self.get_queryset()
        return Response({'count': qs.count()})

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

    @action(detail=True, methods=['get', 'post'], url_path='photos')
    def photos(self, request, pk=None):
        """GET: liste des photos de l'organisme. POST: ajout (fichier multipart ou JSON image_url)."""
        organism = self.get_object()
        if request.method == 'GET':
            photos_qs = Photo.objects.filter(organisme=organism).order_by('-date_prise', '-date_ajout')
            serializer = PhotoSerializer(photos_qs, many=True, context={'request': request})
            return Response(serializer.data)

        # POST: fichier ou image_url
        if request.FILES.get('image'):
            serializer = PhotoCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            photo = serializer.save(organisme=organism)
            return Response(
                PhotoSerializer(photo, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )

        image_url = request.data.get('image_url') if hasattr(request.data, 'get') else None
        if image_url and isinstance(image_url, str) and image_url.strip().startswith('http'):
            url = image_url.strip()
            if not url.lower().startswith('https'):
                return Response(
                    {'detail': 'Seules les URLs HTTPS sont acceptées.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                image_bytes, filename = _download_image_from_url(url)
            except ValueError as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            titre = (request.data.get('titre') or '')[:200] if hasattr(request.data, 'get') else ''
            type_photo = (request.data.get('type_photo') or 'autre')[:35]
            safe_name = re.sub(r'[^\w\-.]', '_', filename)[:120]
            if not safe_name or not re.search(r'\.(jpe?g|png|gif|webp)$', safe_name, re.I):
                safe_name = safe_name or 'image.jpg'
                if not safe_name.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                    safe_name += '.jpg'
            photo = Photo(
                organisme=organism,
                titre=titre or f'{organism.nom_commun} (lien)',
                type_photo=type_photo,
                source_url=url[:500],
            )
            photo.image.save(safe_name, ContentFile(image_bytes), save=True)
            return Response(
                PhotoSerializer(photo, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {'detail': 'Envoyez un fichier "image" (multipart) ou un champ JSON "image_url" (URL HTTPS).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=['post'], url_path=r'photos/(?P<photo_pk>[^/.]+)/set-default')
    def photo_set_default(self, request, pk=None, photo_pk=None):
        """Définit cette photo comme image par défaut de l'espèce."""
        organism = self.get_object()
        photo = get_object_or_404(Photo, pk=photo_pk, organisme=organism)
        organism.photo_principale = photo
        organism.save(update_fields=['photo_principale', 'date_modification'])
        return Response({'detail': 'Image par défaut définie'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='enrich')
    def enrich(self, request, pk=None):
        """
        Enrichit cet organisme depuis VASCAN, USDA et Botanipedia.
        Réservé aux utilisateurs staff. Retourne les résultats par source.
        """
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_staff:
            return Response({'detail': 'Droits insuffisants. Réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)
        organism = self.get_object()
        if not (organism.nom_latin or '').strip():
            return Response(
                {'detail': 'Enrichissement impossible : le nom latin est vide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from species.enrichment import enrich_organism
        try:
            results = enrich_organism(organism, delay=0.6)
            # Format pour le client: { source: { success, message } }
            data = {
                'results': {
                    source: {'success': ok, 'message': msg}
                    for source, (ok, msg) in results.items()
                },
            }
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': f'Erreur lors de l\'enrichissement : {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def _download_image_from_url(url: str, timeout: int = 15, max_size: int = 10 * 1024 * 1024):
    """
    Télécharge une image depuis une URL. Retourne (bytes, filename).
    Lève ValueError en cas d'erreur (URL invalide, pas une image, trop gros, etc.).
    """
    allowed_types = ('image/jpeg', 'image/png', 'image/gif', 'image/webp')
    try:
        r = requests.get(url, timeout=timeout, stream=True)
        r.raise_for_status()
        content_type = (r.headers.get('Content-Type') or '').split(';')[0].strip().lower()
        if content_type not in allowed_types:
            raise ValueError(f'URL ne pointe pas vers une image (Content-Type: {content_type})')
        size = 0
        chunks = []
        for chunk in r.iter_content(chunk_size=65536):
            if chunk:
                size += len(chunk)
                if size > max_size:
                    raise ValueError('Image trop volumineuse (max 10 Mo).')
                chunks.append(chunk)
        image_bytes = b''.join(chunks)
        if not image_bytes:
            raise ValueError('Réponse vide.')
        filename = url.rstrip('/').split('/')[-1].split('?')[0] or 'image.jpg'
        return image_bytes, filename
    except requests.RequestException as e:
        raise ValueError(f'Impossible de télécharger l\'image: {e}') from e


# --- Cultivar ViewSet (liste en lecture seule) ---
class CultivarPagination(PageNumberPagination):
    """Même taille de page que les organismes."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class CultivarViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Liste et détail des cultivars (lecture seule). Filtre ?organism=<id> pour une espèce."""

    queryset = Cultivar.objects.select_related('organism').prefetch_related('porte_greffes').order_by('organism__nom_latin', 'nom')
    pagination_class = CultivarPagination
    serializer_class = CultivarListSerializer

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CultivarSerializer
        return CultivarListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        organism_id = self.request.query_params.get('organism')
        if organism_id:
            try:
                qs = qs.filter(organism_id=int(organism_id))
            except (ValueError, TypeError):
                pass
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(nom__icontains=search)
                | Q(organism__nom_commun__icontains=search)
                | Q(organism__nom_latin__icontains=search)
            )
        qs = qs.select_related('organism', 'organism__photo_principale')
        return qs


# --- SpecimenGroup ViewSet (groupes de pollinisation) ---
class SpecimenGroupViewSet(viewsets.ModelViewSet):
    """CRUD groupes de pollinisation (mâle/femelle ou pollinisation croisée cultivars)."""
    queryset = SpecimenGroup.objects.prefetch_related('members__specimen', 'members__specimen__organisme').order_by('-date_ajout')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return SpecimenGroupCreateUpdateSerializer
        return SpecimenGroupSerializer

    def get_queryset(self):
        return super().get_queryset()

    @action(detail=True, methods=['post'], url_path='members')
    def add_member(self, request, pk=None):
        """POST /api/specimen-groups/:id/members/ { "specimen": id, "role": "principal" }"""
        group = self.get_object()
        ser = SpecimenGroupMemberWriteSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        if SpecimenGroupMember.objects.filter(group=group, specimen=ser.validated_data['specimen']).exists():
            return Response({'detail': 'Ce spécimen est déjà dans le groupe.'}, status=status.HTTP_400_BAD_REQUEST)
        SpecimenGroupMember.objects.create(group=group, **ser.validated_data)
        out = SpecimenGroupSerializer(group, context={'request': request})
        return Response(out.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='members/(?P<member_pk>[0-9]+)')
    def remove_member(self, request, pk=None, member_pk=None):
        """DELETE /api/specimen-groups/:id/members/:member_pk/"""
        group = self.get_object()
        member = SpecimenGroupMember.objects.filter(group=group, pk=member_pk).first()
        if not member:
            return Response({'detail': 'Membre introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        member.delete()
        out = SpecimenGroupSerializer(group, context={'request': request})
        return Response(out.data, status=status.HTTP_200_OK)


# --- Garden ViewSet (liste, détail, création) ---
class GardenViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Liste, détail, création et mise à jour partielle des jardins (PATCH pour onglet Admin vue 3D)."""

    queryset = Garden.objects.order_by('nom')
    serializer_class = GardenMinimalSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return GardenCreateSerializer
        if self.action in ('update', 'partial_update'):
            return GardenUpdateSerializer
        return GardenMinimalSerializer

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated
        if self.action in ('create', 'phenology_alerts', 'warnings'):
            return [IsAuthenticated()]
        return []

    @action(detail=True, methods=['get'], url_path='phenology-alerts')
    def phenology_alerts(self, request, pk=None):
        """GET /api/gardens/<id>/phenology-alerts/ — Alertes phénologiques (stades à confirmer)."""
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        garden = self.get_object()
        from .phenology import compute_phenology_alerts
        alerts = compute_phenology_alerts(garden.id)
        return Response(alerts)

    @action(detail=True, methods=['get'], url_path='warnings')
    def warnings(self, request, pk=None):
        """GET /api/gardens/<id>/warnings/ — Rappels en retard, pollinisateurs manquants, alertes phénologiques (cache 1 h)."""
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        garden = self.get_object()
        from django.core.cache import cache
        from .warnings import compute_garden_warnings
        cache_key = f'warnings_{garden.id}'
        data = cache.get(cache_key)
        if data is None:
            data = compute_garden_warnings(garden.id)
            cache.set(cache_key, data, timeout=3600)
        return Response(data)


# --- Garden GCP (points de contrôle terrain) ---
class GardenGCPViewSet(viewsets.ModelViewSet):
    """CRUD des points de contrôle (GCP) d'un jardin. GET/POST /api/gardens/<garden_pk>/gcps/ ; GET/PATCH/DELETE /api/gardens/<garden_pk>/gcps/<pk>/."""
    serializer_class = GardenGCPSerializer
    permission_classes = []  # checked in as_view with garden_pk

    def get_queryset(self):
        return GardenGCP.objects.filter(
            garden_id=self.kwargs['garden_pk']
        ).order_by('label')

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(garden_id=self.kwargs['garden_pk'])


# --- Zone (zones d'un jardin, polygones PostGIS) ---
class ZoneViewSet(viewsets.ModelViewSet):
    """
    CRUD zones : GET/POST /api/zones/?garden_id=<id> ; GET/PUT/DELETE /api/zones/<id>/.
    """
    serializer_class = ZoneSerializer
    queryset = Zone.objects.select_related('garden').order_by('ordre', 'nom')

    def get_queryset(self):
        qs = super().get_queryset()
        garden_id = self.request.query_params.get('garden_id')
        if garden_id is not None:
            try:
                qs = qs.filter(garden_id=int(garden_id))
            except (ValueError, TypeError):
                pass
        return qs


def export_garden_gcps_csv(request, garden_pk):
    """GET /api/gardens/<garden_pk>/gcps/export/ — CSV pour OpenDroneMap (GCP_Label, Longitude, Latitude, Altitude, Image_Name)."""
    if not getattr(request, 'user', None) or not request.user.is_authenticated:
        return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
    garden = get_object_or_404(Garden, pk=garden_pk)
    gcps = GardenGCP.objects.filter(garden=garden).order_by('label')
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(['GCP_Label', 'Longitude', 'Latitude', 'Altitude', 'Image_Name'])
    for g in gcps:
        image_name = g.photo.name if g.photo else ''
        w.writerow([g.label, g.longitude, g.latitude, '', image_name])
    response = HttpResponse(buf.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="gcps_garden_{garden_pk}.csv"'
    return response


# --- Partenaires / Fournisseurs (onglet Partenaires vue 3D) ---
class PartnersListView(APIView):
    """
    GET /api/partners/ — Liste des partenaires actifs (nom, url, ordre) pour l'onglet Partenaires.
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        partners = Partner.objects.filter(actif=True).order_by('ordre', 'nom')
        serializer = PartnerSerializer(partners, many=True)
        return Response(serializer.data)


# --- Préférences utilisateur (jardin par défaut, distance pollinisation) ---
class UserPreferencesView(APIView):
    """
    GET /api/me/preferences/  -> { "default_garden_id": int | null, "pollination_distance_max_default_m": float | null }
    PATCH /api/me/preferences/ -> body { "default_garden_id": int | null, "pollination_distance_max_default_m": float | null }
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        prefs, _ = UserPreference.objects.get_or_create(user=request.user, defaults={})
        return Response({
            'default_garden_id': prefs.default_garden_id,
            'pollination_distance_max_default_m': prefs.pollination_distance_max_default_m,
        })

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        prefs, _ = UserPreference.objects.get_or_create(user=request.user, defaults={})
        if 'default_garden_id' in request.data:
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
        if 'pollination_distance_max_default_m' in request.data:
            val = request.data.get('pollination_distance_max_default_m')
            if val is None:
                prefs.pollination_distance_max_default_m = None
            else:
                try:
                    f = float(val)
                    if f < 0:
                        return Response(
                            {'detail': 'La distance doit être positive ou nulle.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    prefs.pollination_distance_max_default_m = f
                except (TypeError, ValueError):
                    return Response(
                        {'detail': 'Valeur numérique invalide pour pollination_distance_max_default_m.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        prefs.save()
        return Response({
            'default_garden_id': prefs.default_garden_id,
            'pollination_distance_max_default_m': prefs.pollination_distance_max_default_m,
        })


# --- Profil utilisateur (moi) ---
class MeView(APIView):
    """
    GET /api/me/  -> { "username", "email", "first_name", "last_name", "is_staff", "is_superuser" }
    PATCH /api/me/ -> body { "email", "first_name", "last_name" } (optionnels)
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        u = request.user
        return Response({
            'username': u.username,
            'email': u.email or '',
            'first_name': u.first_name or '',
            'last_name': u.last_name or '',
            'is_staff': getattr(u, 'is_staff', False),
            'is_superuser': getattr(u, 'is_superuser', False),
        })

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        u = request.user
        if 'email' in request.data:
            u.email = (request.data.get('email') or '').strip() or ''
        if 'first_name' in request.data:
            u.first_name = (request.data.get('first_name') or '').strip()[:150]
        if 'last_name' in request.data:
            u.last_name = (request.data.get('last_name') or '').strip()[:150]
        u.save()
        return Response({
            'username': u.username,
            'email': u.email or '',
            'first_name': u.first_name or '',
            'last_name': u.last_name or '',
            'is_staff': getattr(u, 'is_staff', False),
            'is_superuser': getattr(u, 'is_superuser', False),
        })


# --- Gestion des utilisateurs (superuser peut promouvoir en admin) ---
class AdminUserListView(APIView):
    """
    GET /api/admin/users/
    Liste des utilisateurs (id, username, email, is_staff, is_superuser).
    Réservé aux utilisateurs staff.
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_staff:
            return Response({'detail': 'Droits insuffisants'}, status=status.HTTP_403_FORBIDDEN)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = User.objects.all().order_by('username').values('id', 'username', 'email', 'is_staff', 'is_superuser')
        return Response(list(users))


class AdminUserDetailView(APIView):
    """
    PATCH /api/admin/users/<id>/
    Body: { "is_staff": bool }
    Modifier le statut administrateur d'un utilisateur. Réservé aux superusers.
    """
    def patch(self, request, pk):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response({'detail': 'Seul un superutilisateur peut modifier les droits.'}, status=status.HTTP_403_FORBIDDEN)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = get_object_or_404(User, pk=pk)
        if 'is_staff' in request.data:
            user.is_staff = bool(request.data['is_staff'])
            user.save(update_fields=['is_staff'])
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email or '',
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        })


class ChangePasswordView(APIView):
    """
    POST /api/me/change-password/
    Body: { "current_password": str, "new_password": str }
    """
    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        current = request.data.get('current_password')
        new_password = request.data.get('new_password')
        if not current:
            return Response(
                {'detail': 'Mot de passe actuel requis.', 'current_password': 'Requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not new_password:
            return Response(
                {'detail': 'Nouveau mot de passe requis.', 'new_password': 'Requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(current):
            return Response(
                {'detail': 'Mot de passe actuel incorrect.', 'current_password': 'Incorrect'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(new_password)
        request.user.save()
        return Response({'detail': 'Mot de passe modifié.'})


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


class ExpectedEventsView(APIView):
    """
    GET /api/expected-events/?month=5
    Retourne les événements attendus (floraison, récolte, etc.) pour le mois donné,
    basés sur OrganismCalendrier, pour les organismes des spécimens favoris et organismes favoris.
    month: 1-12 (défaut: mois courant).
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            month = int(request.query_params.get('month', date.today().month))
        except (TypeError, ValueError):
            month = date.today().month
        if not 1 <= month <= 12:
            month = date.today().month

        organism_ids_specimens = SpecimenFavorite.objects.filter(
            user=request.user
        ).values_list('specimen__organisme_id', flat=True).distinct()
        organism_ids_fav = OrganismFavorite.objects.filter(
            user=request.user
        ).values_list('organism_id', flat=True).distinct()
        organism_ids = set(organism_ids_specimens) | set(organism_ids_fav)
        if not organism_ids:
            return Response([])

        cal = OrganismCalendrier.objects.filter(
            organisme_id__in=organism_ids,
            mois_debut__lte=month,
            mois_fin__gte=month,
        ).select_related('organisme').order_by('type_periode', 'organisme__nom_commun')

        result = []
        for c in cal:
            result.append({
                'type_periode': c.type_periode,
                'type_periode_display': c.get_type_periode_display(),
                'mois_debut': c.mois_debut,
                'mois_fin': c.mois_fin,
                'organisme_id': c.organisme_id,
                'organisme_nom': c.organisme.nom_commun,
                'organisme_nom_latin': c.organisme.nom_latin or '',
                'source': c.source,
            })
        return Response(result)


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


# --- Stats espèces (admin) ---
class SpeciesStatsView(APIView):
    """
    GET /api/admin/species-stats/
    Retourne le nombre d'organismes (espèces) et la note d'enrichissement globale. Réservé aux staff.
    """
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_staff:
            return Response({'detail': 'Droits insuffisants'}, status=status.HTTP_403_FORBIDDEN)
        from species.models import BaseEnrichmentStats
        count = Organism.objects.count()
        stats = BaseEnrichmentStats.objects.first()
        global_score = stats.global_score_pct if stats else None
        return Response({
            'organism_count': count,
            'global_enrichment_score_pct': global_score,
        })


# --- Import VASCAN depuis fichier (upload) ---
class ImportVascanFileView(APIView):
    """
    POST /api/admin/import-vascan-file/
    Body: multipart/form-data avec champ "file" (fichier texte ou tab-delimited).
    Exécute import_vascan --file avec le fichier uploadé. Réservé aux staff.
    """
    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_staff:
            return Response({'detail': 'Droits insuffisants'}, status=status.HTTP_403_FORBIDDEN)

        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response(
                {'detail': 'Aucun fichier. Envoyez un fichier avec le champ "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import tempfile
        from django.core.management import call_command
        from io import StringIO

        suffix = '.txt'
        if uploaded.name and '.' in uploaded.name:
            suffix = '.' + uploaded.name.rsplit('.', 1)[-1]
        with tempfile.NamedTemporaryFile(mode='wb', suffix=suffix, delete=False) as f:
            for chunk in uploaded.chunks():
                f.write(chunk)
            path = f.name
        try:
            out = StringIO()
            err = StringIO()
            try:
                call_command('import_vascan', file=path, stdout=out, stderr=err)
                output = (out.getvalue() + '\n' + err.getvalue()).strip()
                return Response({'success': True, 'output': output or 'Import terminé.'})
            except Exception as e:
                output = (out.getvalue() + '\n' + err.getvalue()).strip() or str(e)
                return Response({'success': False, 'output': output, 'detail': 'Erreur lors de l\'import'})
        finally:
            import os
            try:
                os.unlink(path)
            except OSError:
                pass


# --- Commandes admin (paramètres avancés, staff uniquement) ---
ALLOWED_ADMIN_COMMANDS = {
    'import_vascan': {'enrich': bool, 'limit': int, 'delay': float},
    'import_usda': {'enrich': bool, 'limit': int, 'delay': float},
    'import_hydroquebec': {'limit': int, 'curl': bool, 'insecure': bool},
    'import_botanipedia': {'enrich': bool, 'limit': int, 'delay': float, 'verbose': bool},
    'import_arbres_en_ligne': {'file': str},
    'import_ancestrale': {'file': str},
    'import_topic': {'file': str, 'limit': int, 'dry_run': bool},
    'import_usda_chars': {'enrich': bool, 'file': str, 'limit': int, 'delay': float, 'dry_run': bool},
    'import_wikidata': {'enrich': bool, 'limit': int, 'delay': float, 'dry_run': bool},
    'merge_organism_duplicates': {'dry_run': bool, 'no_input': bool},
    'populate_proprietes_usage_calendrier': {'limit': int},
    'clean_organisms_keep_hq': {'no_input': bool},
    'wipe_db_and_media': {'no_input': bool},
    'wipe_species': {'no_input': bool},
}


def _build_command_kwargs(command_name: str, options: dict) -> dict:
    """Construit les kwargs pour call_command à partir des options autorisées."""
    allowed = ALLOWED_ADMIN_COMMANDS.get(command_name)
    if not allowed:
        return {}
    kwargs = {}
    for key, type_hint in allowed.items():
        val = options.get(key)
        if val is None:
            continue
        if type_hint is bool:
            kwargs[key] = val if isinstance(val, bool) else val in ("1", "on", "true", "yes")
        elif type_hint is int:
            kwargs[key] = int(val) if val != '' else 0
        elif type_hint is float:
            kwargs[key] = float(val) if val != '' else 0.0
        elif type_hint is str and val:
            kwargs[key] = str(val).strip()
    return kwargs


class RunAdminCommandView(APIView):
    """
    POST /api/admin/run-command/
    Body: { "command": "import_vascan", "options": { "enrich": true, "limit": 50 } }
    Réservé aux utilisateurs staff. Exécute une commande de management autorisée et retourne la sortie.
    """
    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_staff:
            return Response({'detail': 'Droits insuffisants'}, status=status.HTTP_403_FORBIDDEN)

        command = (request.data.get('command') or '').strip()
        if command not in ALLOWED_ADMIN_COMMANDS:
            return Response(
                {'detail': f'Commande non autorisée. Autorisées: {", ".join(sorted(ALLOWED_ADMIN_COMMANDS))}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        options = request.data.get('options') or {}
        cmd_kwargs = _build_command_kwargs(command, options)
        if command in ('merge_organism_duplicates', 'wipe_db_and_media', 'wipe_species'):
            cmd_kwargs.setdefault('no_input', True)

        from io import StringIO
        from django.core.management import call_command

        out = StringIO()
        err = StringIO()
        try:
            call_command(command, stdout=out, stderr=err, **cmd_kwargs)
            output = (out.getvalue() + '\n' + err.getvalue()).strip()
            return Response({'success': True, 'output': output or 'Commande exécutée.'})
        except SystemExit:
            output = (out.getvalue() + '\n' + err.getvalue()).strip()
            return Response({'success': False, 'output': output, 'detail': 'Options manquantes ou erreur'})
        except Exception as e:
            output = (out.getvalue() + '\n' + err.getvalue()).strip() or str(e)
            return Response({'success': False, 'output': output, 'detail': 'Erreur lors de l\'exécution'})