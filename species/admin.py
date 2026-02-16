from django.contrib import admin
from .models import Organism, CompanionRelation, Amendment, Specimen, Event, Photo


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
        'indigene',
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
            'fields': ('fixateur_azote', 'accumulateur_dynamique', 'mellifere', 'produit_juglone', 'indigene'),
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

@admin.register(Specimen)
class SpecimenAdmin(admin.ModelAdmin):
    list_display = [
        'nom',
        'organisme',
        'zone_jardin',
        'statut',
        'date_plantation',
        'age_display',
        'sante_stars'
    ]
    
    list_filter = [
        'statut',
        'source',
        'zone_jardin',
        'organisme__type_organisme',
        'date_plantation'
    ]
    
    search_fields = [
        'nom',
        'code_identification',
        'organisme__nom_commun',
        'organisme__nom_latin',
        'notes'
    ]
    
    autocomplete_fields = ['organisme']
    
    date_hierarchy = 'date_plantation'
    
    fieldsets = (
        ('Identification', {
            'fields': ('organisme', 'nom', 'code_identification')
        }),
        ('Localisation', {
            'fields': ('zone_jardin', 'latitude', 'longitude')
        }),
        ('Plantation', {
            'fields': ('date_plantation', 'age_plantation', 'source', 'pepiniere_fournisseur')
        }),
        ('État Actuel', {
            'fields': ('statut', 'sante', 'hauteur_actuelle')
        }),
        ('Production', {
            'fields': ('premiere_fructification',),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
    )
    
    def age_display(self, obj):
        age = obj.age_annees()
        if age:
            return f"{age} ans"
        return "-"
    age_display.short_description = "Âge"
    
    def sante_stars(self, obj):
        stars = "⭐" * (obj.sante // 2)
        return stars if stars else "-"
    sante_stars.short_description = "Santé"

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = [
        'emoji_type',
        'specimen',
        'type_event',
        'date',
        'quantite_display',
        'temperature'
    ]
    
    list_filter = [
        'type_event',
        'date',
        'specimen__organisme__type_organisme'
    ]
    
    search_fields = [
        'specimen__nom',
        'titre',
        'description',
        'produit_utilise'
    ]
    
    autocomplete_fields = ['specimen', 'amendment']
    
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Quoi?', {
            'fields': ('specimen', 'type_event', 'titre')
        }),
        ('Quand?', {
            'fields': ('date', 'heure')
        }),
        ('Détails', {
            'fields': ('description', 'quantite', 'unite')
        }),
        ('Produits/Amendements', {
            'fields': ('amendment', 'produit_utilise'),
            'classes': ('collapse',)
        }),
        ('Conditions', {
            'fields': ('temperature', 'conditions_meteo'),
            'classes': ('collapse',)
        }),
    )
    
    def emoji_type(self, obj):
        return dict(Event.TYPE_CHOICES).get(obj.type_event, '📝').split()[0]
    emoji_type.short_description = ""
    
    def quantite_display(self, obj):
        if obj.quantite and obj.unite:
            return f"{obj.quantite} {obj.unite}"
        elif obj.quantite:
            return str(obj.quantite)
        return "-"
    quantite_display.short_description = "Quantité"

@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = [
        'miniature',
        'get_sujet',
        'titre',
        'date_prise',
        'date_ajout'
    ]
    
    list_filter = [
        'date_prise',
        'date_ajout'
    ]
    
    search_fields = [
        'titre',
        'description',
        'specimen__nom',
        'organisme__nom_commun'
    ]
    
    autocomplete_fields = ['organisme', 'specimen', 'event']
    
    date_hierarchy = 'date_prise'
    
    fieldsets = (
        ('Image', {
            'fields': ('image', 'titre', 'description', 'date_prise')
        }),
        ('Lié à', {
            'fields': ('organisme', 'specimen', 'event')
        }),
    )
    
    def miniature(self, obj):
        if obj.image:
            from django.utils.html import format_html
            return format_html(
            '<img src="{}" width="80" height="80" style="object-fit: cover; border-radius: 4px;" />',
            obj.image.url
        )
        return "-"
    miniature.short_description = ""

    def get_sujet(self, obj):
        if obj.specimen:
            return f"🌳 {obj.specimen.nom}"
        elif obj.organisme:
            return f"📚 {obj.organisme.nom_commun}"
        elif obj.event:
            return f"📅 {obj.event}"
        return "-"
    get_sujet.short_description = "Sujet"