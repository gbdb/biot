from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'catalog'
    verbose_name = 'Catalogue (espèces, semences, amendements)'

    def ready(self):
        import catalog.signals  # noqa: F401 - connect post_save Organism → search_vector
