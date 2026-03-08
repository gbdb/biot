from django.apps import AppConfig


class GardensConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gardens'
    verbose_name = 'Jardins et météo'

    def ready(self):
        import gardens.signals  # noqa: F401
