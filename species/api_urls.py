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
    ExpectedEventsView,
    RemindersUpcomingView,
    WeatherAlertsView,
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

urlpatterns = [
    path('specimens/by-nfc/<str:uid>/', SpecimenByNfcView.as_view(), name='specimen-by-nfc'),
    path('expected-events/', ExpectedEventsView.as_view(), name='expected-events'),
    path('reminders/upcoming/', RemindersUpcomingView.as_view(), name='reminders-upcoming'),
    path('weather-alerts/', WeatherAlertsView.as_view(), name='weather-alerts'),
    path('me/', MeView.as_view(), name='me'),
    path('me/preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    path('me/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/run-command/', RunAdminCommandView.as_view(), name='admin-run-command'),
    path('admin/species-stats/', SpeciesStatsView.as_view(), name='admin-species-stats'),
    path('admin/import-vascan-file/', ImportVascanFileView.as_view(), name='admin-import-vascan-file'),
    path('', include(router.urls)),
]
