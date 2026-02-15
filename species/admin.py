from django.contrib import admin
from .models import Organism, CompanionRelation, Amendment


@admin.register(Organism)
class OrganismAdmin(admin.ModelAdmin):
    list_display = [
        'nom_commun',
        'nom_latin', 
        'regne',
        'type_organisme',
        'besoin_eau',
        'besoin_soleil',
        'zone_rusticite',
        'comestible'
    ]
    
    list_filter = [
        'regne',
        'type_organisme',
        'besoin_eau',
        'besoin_soleil',
        'comestible',
        'fixateur_azote',
        'mellifere',
    ]
    
    search_fields = [
        'nom_commun',
        'nom_latin',
        'famille',
        'description'
    ]
    
    fieldsets = (
        ('Identification', {
            'fields': ('nom_commun', 'nom_latin', 'famille', 'regne', 'type_organisme')
        }),
        ('Besoins Culturaux', {
            'fields': ('besoin_eau', 'besoin_soleil', 'zone_rusticite')
        }),
        ('Sol', {
            'fields': ('sol_textures', 'sol_ph', 'sol_drainage', 'sol_richesse'),
            'classes': ('collapse',)
        }),
        ('Caractéristiques Physiques', {
            'fields': ('hauteur_max', 'largeur_max', 'vitesse_croissance'),
            'classes': ('collapse',)
        }),
        ('Comestibilité', {
            'fields': ('comestible', 'parties_comestibles', 'toxicite')
        }),
        ('Arbres Fruitiers/Noix', {
            'fields': ('type_noix', 'age_fructification', 'periode_recolte', 'pollinisation', 'production_annuelle'),
            'classes': ('collapse',)
        }),
        ('Écologie', {
            'fields': ('fixateur_azote', 'accumulateur_dynamique', 'mellifere', 'produit_juglone'),
            'classes': ('collapse',)
        }),
        ('Informations', {
            'fields': ('description', 'notes', 'usages_autres')
        }),
        ('Données Externes', {
            'fields': ('data_sources',),
            'classes': ('collapse',)
        }),
    )

@admin.register(CompanionRelation)
class CompanionRelationAdmin(admin.ModelAdmin):
    list_display = [
        'organisme_source',
        'type_relation_emoji',
        'organisme_cible',
        'type_relation',
        'force'
    ]
    
    list_filter = [
        'type_relation',
        'force'
    ]
    
    search_fields = [
        'organisme_source__nom_commun',
        'organisme_cible__nom_commun',
        'description'
    ]
    
    autocomplete_fields = ['organisme_source', 'organisme_cible']
    
    fieldsets = (
        (None, {
            'fields': ('organisme_source', 'organisme_cible', 'type_relation')
        }),
        ('Détails', {
            'fields': ('force', 'distance_optimale', 'description', 'source_info')
        }),
    )
    
    def type_relation_emoji(self, obj):
        if any(word in obj.type_relation for word in ['positif', 'fixateur', 'attire', 'mycorhize', 'abri', 'support']):
            return "✅"
        elif any(word in obj.type_relation for word in ['negatif', 'allelopathie', 'competition']):
            return "❌"
        return "⚠️"
    type_relation_emoji.short_description = ""

@admin.register(Amendment)
class AmendmentAdmin(admin.ModelAdmin):
    list_display = [
        'nom',
        'type_amendment',
        'npk_display',
        'effet_ph',
        'biologique'
    ]
    
    list_filter = [
        'type_amendment',
        'effet_ph',
        'biologique'
    ]
    
    search_fields = [
        'nom',
        'description'
    ]
    
    fieldsets = (
        ('Identification', {
            'fields': ('nom', 'type_amendment', 'biologique')
        }),
        ('Composition NPK', {
            'fields': ('azote_n', 'phosphore_p', 'potassium_k'),
            'classes': ('collapse',)
        }),
        ('Effets', {
            'fields': ('effet_ph', 'bon_pour_sols', 'bon_pour_types')
        }),
        ('Utilisation', {
            'fields': ('dose_recommandee', 'periode_application', 'description')
        }),
    )
    
    def npk_display(self, obj):
        if obj.azote_n or obj.phosphore_p or obj.potassium_k:
            return f"{obj.azote_n or 0}-{obj.phosphore_p or 0}-{obj.potassium_k or 0}"
        return "-"
    npk_display.short_description = "NPK"