"""
URLs de l'API REST (app mobile Jardin Biot).
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api_views import (
    SpecimenByNfcView,
    SpecimenViewSet,
    SpecimenGroupViewSet,
    OrganismViewSet,
    CultivarViewSet,
    GardenViewSet,
    GardenGCPViewSet,
    ZoneViewSet,
    export_garden_gcps_csv,
    ExpectedEventsView,
    RemindersUpcomingView,
    WeatherAlertsView,
    PartnersListView,
    UserPreferencesView,
    MeView,
    ChangePasswordView,
    AdminUserListView,
    AdminUserDetailView,
    RunAdminCommandView,
    SpeciesStatsView,
    ImportVascanFileView,
)

router = DefaultRouter()
router.register(r'specimens', SpecimenViewSet, basename='specimen')
router.register(r'specimen-groups', SpecimenGroupViewSet, basename='specimen-group')
router.register(r'organisms', OrganismViewSet, basename='organism')
router.register(r'cultivars', CultivarViewSet, basename='cultivar')
router.register(r'gardens', GardenViewSet, basename='garden')
router.register(r'zones', ZoneViewSet, basename='zone')

urlpatterns = [
    path('specimens/by-nfc/<str:uid>/', SpecimenByNfcView.as_view(), name='specimen-by-nfc'),
    path('expected-events/', ExpectedEventsView.as_view(), name='expected-events'),
    path('reminders/upcoming/', RemindersUpcomingView.as_view(), name='reminders-upcoming'),
    path('weather-alerts/', WeatherAlertsView.as_view(), name='weather-alerts'),
    path('partners/', PartnersListView.as_view(), name='partners-list'),
    path('me/', MeView.as_view(), name='me'),
    path('me/preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    path('me/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/run-command/', RunAdminCommandView.as_view(), name='admin-run-command'),
    path('admin/species-stats/', SpeciesStatsView.as_view(), name='admin-species-stats'),
    path('admin/import-vascan-file/', ImportVascanFileView.as_view(), name='admin-import-vascan-file'),
    # GCP (points de contrôle) — avant le router pour prendre en charge gardens/<pk>/gcps/
    path('gardens/<int:garden_pk>/gcps/', GardenGCPViewSet.as_view({'get': 'list', 'post': 'create'}), name='garden-gcps'),
    path('gardens/<int:garden_pk>/gcps/export/', export_garden_gcps_csv, name='garden-gcps-export'),
    path('gardens/<int:garden_pk>/gcps/<int:pk>/', GardenGCPViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'}), name='garden-gcp-detail'),
    path('', include(router.urls)),
]
