from django.apps import AppConfig


class SpeciesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'species'

    def ready(self):
        pass  # Signals moved to gardens.signals (Garden) and specimens if any
