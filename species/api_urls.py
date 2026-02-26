"""
URLs de l'API REST (app mobile Jardin Biot).
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api_views import (
    SpecimenByNfcView,
    SpecimenViewSet,
    OrganismViewSet,
    GardenViewSet,
    RemindersUpcomingView,
    WeatherAlertsView,
    UserPreferencesView,
)

router = DefaultRouter()
router.register(r'specimens', SpecimenViewSet, basename='specimen')
router.register(r'organisms', OrganismViewSet, basename='organism')
router.register(r'gardens', GardenViewSet, basename='garden')

urlpatterns = [
    path('specimens/by-nfc/<str:uid>/', SpecimenByNfcView.as_view(), name='specimen-by-nfc'),
    path('reminders/upcoming/', RemindersUpcomingView.as_view(), name='reminders-upcoming'),
    path('weather-alerts/', WeatherAlertsView.as_view(), name='weather-alerts'),
    path('me/preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    path('', include(router.urls)),
]
