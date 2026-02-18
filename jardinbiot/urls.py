from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from species.views import (
    companion_network_view,
    weather_dashboard_view,
    trigger_sprinkler_view,
    fetch_garden_weather_view,
    geocode_garden_view,
)

urlpatterns = [
    path('admin/species/companion-network/', companion_network_view, name='companion_network'),
    path('admin/weather/', weather_dashboard_view, name='weather_dashboard'),
    path('admin/species/garden/<int:garden_id>/geocode/', geocode_garden_view, name='geocode_garden'),
    path('admin/weather/fetch/<int:garden_id>/', fetch_garden_weather_view, name='fetch_garden_weather'),
    path('admin/weather/trigger/<int:zone_id>/', trigger_sprinkler_view, name='trigger_sprinkler'),
    path('admin/', admin.site.urls),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)