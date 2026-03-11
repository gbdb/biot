from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from species.auth_views import RegisterView
from species.views import (
    cesium_terrain_view,
    companion_network_view,
    weather_dashboard_view,
    trigger_sprinkler_view,
    fetch_garden_weather_view,
    geocode_garden_view,
    gestion_donnees_view,
    hq_file_stats_view,
)

urlpatterns = [
    path('favicon.ico', RedirectView.as_view(url=settings.STATIC_URL + 'favicon.png', permanent=False)),
    path('cesium-view/', cesium_terrain_view, name='cesium-terrain'),
    path('api/', include('species.api_urls')),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/auth/register/', RegisterView.as_view(), name='auth_register'),
    path('admin/species/companion-network/', companion_network_view, name='companion_network'),
    path('admin/weather/', weather_dashboard_view, name='weather_dashboard'),
    path('admin/species/garden/<int:garden_id>/geocode/', geocode_garden_view, name='geocode_garden'),
    path('admin/weather/fetch/<int:garden_id>/', fetch_garden_weather_view, name='fetch_garden_weather'),
    path('admin/weather/trigger/<int:zone_id>/', trigger_sprinkler_view, name='trigger_sprinkler'),
    path('admin/gestion-donnees/', gestion_donnees_view, name='gestion_donnees'),
    path('admin/gestion-donnees/hq-file-stats/', hq_file_stats_view, name='hq_file_stats'),
    path('admin/', admin.site.urls),
]

# Serve media files and debug toolbar in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass