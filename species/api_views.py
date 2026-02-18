"""
Vues API REST pour l'app mobile Jardin Biot.
Endpoints: specimens, events, photos, organisms, gardens, NFC lookup.
"""
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Organism, Garden, Specimen, Event, Photo
from .serializers import (
    OrganismMinimalSerializer,
    GardenMinimalSerializer,
    SpecimenListSerializer,
    SpecimenDetailSerializer,
    SpecimenCreateUpdateSerializer,
    EventSerializer,
    EventCreateSerializer,
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