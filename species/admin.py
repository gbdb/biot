from django.contrib import admin
from .models import Species

@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = ['nom_commun', 'nom_latin', 'famille', 'besoin_eau', 'besoin_soleil']
    list_filter = ['besoin_eau', 'besoin_soleil']
    search_fields = ['nom_commun', 'nom_latin', 'famille']