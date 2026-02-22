"""
Vues API REST pour l'app mobile Jardin Biot.
Endpoints: specimens, events, photos, organisms, gardens, NFC lookup.
"""
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.shortcuts import get_object_or_404

from .models import Organism, Garden, Specimen, Event, Photo
from .serializers import (
    OrganismMinimalSerializer,
    GardenMinimalSerializer,
    SpecimenListSerializer,
    SpecimenDetailSerializer,
    SpecimenCreateUpdateSerializer,
    EventSerializer,
    EventCreateSerializer,
    EventUpdateSerializer,
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

    queryset = Specimen.objects.select_related('organisme', 'garden').order_by('-date_plantation', 'nom')

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
        return qs

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


# --- Organism ViewSet (lecture) ---
class OrganismViewSet(viewsets.ReadOnlyModelViewSet):
    """Liste et détail des organismes (pour créer un spécimen)."""

    queryset = Organism.objects.order_by('nom_commun')
    serializer_class = OrganismMinimalSerializer

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
        return qs


# --- Garden ViewSet (lecture) ---
class GardenViewSet(viewsets.ReadOnlyModelViewSet):
    """Liste et détail des jardins."""

    queryset = Garden.objects.order_by('nom')
    serializer_class = GardenMinimalSerializer