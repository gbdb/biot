import tempfile
from pathlib import Path

from django.contrib import admin
from django.contrib import messages
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html

from .export_utils import (
    export_organisms_csv_simple,
    export_organisms_pdf,
    export_specimens_csv,
    export_seed_collections_csv,
)
from .forms import ImportPFAFForm, ImportSeedsForm
from gardens.models import Partner, Zone
from .models import (
    Organism, OrganismPropriete, OrganismUsage, OrganismCalendrier,
    Cultivar, CultivarPollinator, CultivarPorteGreffe,
    UserTag, CompanionRelation, Amendment, OrganismAmendment,
    Specimen, SpecimenGroup, SpecimenGroupMember,
    Event, Reminder, Photo,
    SeedSupplier, SeedCollection, SemisBatch,
    Garden, WeatherRecord, SprinklerZone,
    UserPreference,
    DataImportRun,
)


class PhotoOrganismInline(admin.TabularInline):
    """Inline pour ajouter plusieurs photos à un organisme depuis sa fiche."""
    model = Photo
    fk_name = 'organisme'
    extra = 1
    fields = ('image', 'type_photo', 'titre', 'date_prise')
    verbose_name = "Photo de l'espèce"
    verbose_name_plural = "Photos de l'espèce"


class OrganismProprieteInline(admin.TabularInline):
    model = OrganismPropriete
    extra = 0
    fields = ('type_sol', 'ph_min', 'ph_max', 'tolerance_ombre', 'source')
    verbose_name = "Propriété (sol / exposition)"
    verbose_name_plural = "Propriétés (sol / exposition)"


class OrganismUsageInline(admin.TabularInline):
    model = OrganismUsage
    extra = 0
    fields = ('type_usage', 'parties', 'description', 'source')
    verbose_name = "Usage"
    verbose_name_plural = "Usages"


class OrganismCalendrierInline(admin.TabularInline):
    model = OrganismCalendrier
    extra = 0
    fields = ('type_periode', 'mois_debut', 'mois_fin', 'source')
    verbose_name = "Calendrier (période)"
    verbose_name_plural = "Calendrier (périodes)"


class CultivarInline(admin.TabularInline):
    model = Cultivar
    extra = 0
    fields = ('slug_cultivar', 'nom', 'couleur_fruit', 'gout', 'resistance_maladies')
    verbose_name = "Cultivar"
    verbose_name_plural = "Cultivars"


class EventSpecimenInline(admin.TabularInline):
    """Journal de bord : événements directement sur la fiche spécimen."""
    model = Event
    fk_name = 'specimen'
    extra = 0
    fields = ('type_event', 'date', 'titre', 'description', 'quantite', 'unite', 'amendment')
    verbose_name = "Événement"
    verbose_name_plural = "Événements"
    ordering = ['-date', '-heure']
    show_change_link = True


class ReminderSpecimenInline(admin.TabularInline):
    """Rappels du spécimen."""
    model = Reminder
    fk_name = 'specimen'
    extra = 0
    fields = ('type_rappel', 'date_rappel', 'type_alerte', 'titre', 'description')
    verbose_name = "Rappel"
    verbose_name_plural = "Rappels"
    ordering = ['date_rappel', 'date_ajout']
    show_change_link = True


class PhotoSpecimenInline(admin.TabularInline):
    """Galerie de photos du spécimen."""
    model = Photo
    fk_name = 'specimen'
    extra = 1
    fields = ('image', 'type_photo', 'titre', 'date_prise', 'description')
    verbose_name = "Photo du spécimen"
    verbose_name_plural = "Photos du spécimen"
from .pfaf_mapping import (
    PFAF_FIELD_ALIASES,
    get_available_columns,
    get_row_value,
    load_pfaf_data,
)
from .seed_mapping import (
    SEED_FIELD_ALIASES,
    get_row_value as seed_get_row_value,
    load_seed_data,
    parse_bool,
    parse_float,
    parse_int,
    parse_int_or_range,
)
from .source_rules import (
    MERGE_FILL_GAPS,
    MERGE_OVERWRITE,
    SOURCE_PFAF,
    apply_fill_gaps,
    find_or_match_organism,
    merge_zones_rusticite,
)


@admin.register(Organism)
class OrganismAdmin(admin.ModelAdmin):
    inlines = [
        CultivarInline,
        PhotoOrganismInline,
        OrganismProprieteInline,
        OrganismUsageInline,
        OrganismCalendrierInline,
    ]
    actions = ["export_organismes_csv", "export_organismes_pdf"]
    change_list_template = "admin/species/organism/change_list.html"
    change_form_template = "admin/species/organism/change_form.html"

    list_display = [
        'nom_commun',
        'nom_latin',
        'slug_latin',
        'vascan_id',
        'tsn',
        'regne',
        'type_organisme',
        'besoin_eau',
        'besoin_soleil',
        'zones_display',
        'comestible',
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
            'fields': ('nom_commun', 'nom_latin', 'vascan_id', 'tsn', 'famille', 'regne', 'type_organisme')
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
    
    def zones_display(self, obj):
        """Affiche toutes les zones de rusticité avec leurs sources."""
        if not obj.zone_rusticite or not isinstance(obj.zone_rusticite, list):
            return '-'
        zones = [
            z for z in obj.zone_rusticite
            if isinstance(z, dict) and z.get('zone')
        ]
        if not zones:
            return '-'
        # Formater: "4a (HQ), 5b (PFAF)"
        formatted = []
        source_labels = {'hydroquebec': 'HQ', 'pfaf': 'PFAF', 'unknown': '?'}
        for z in zones:
            zone = z.get('zone', '')
            source = z.get('source', 'unknown')
            label = source_labels.get(source, source)
            formatted.append(f"{zone} ({label})")
        return ', '.join(formatted)
    zones_display.short_description = "Zones rusticité"

    @admin.action(description="Exporter en CSV")
    def export_organismes_csv(self, request, queryset):
        return export_organisms_csv_simple(queryset)

    @admin.action(description="Exporter en PDF")
    def export_organismes_pdf(self, request, queryset):
        from django.http import HttpResponse
        pdf_bytes = export_organisms_pdf(queryset)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="organismes.pdf"'
        return response

    def changelist_view(self, request, extra_context=None):
        export_type = request.GET.get("export")
        if export_type in ("csv", "pdf"):
            get_copy = request.GET.copy()
            if "export" in get_copy:
                del get_copy["export"]
            request.GET = get_copy
            cl = self.get_changelist_instance(request)
            queryset = cl.get_queryset(request)
            if export_type == "csv":
                return export_organisms_csv_simple(queryset)
            if export_type == "pdf":
                from django.http import HttpResponse
                pdf_bytes = export_organisms_pdf(queryset)
                response = HttpResponse(pdf_bytes, content_type="application/pdf")
                response["Content-Disposition"] = 'attachment; filename="organismes.pdf"'
                return response
        extra_context = extra_context or {}
        extra_context["last_pfaf_run"] = DataImportRun.objects.filter(source="pfaf").order_by("-started_at").first()
        extra_context["last_hydroquebec_run"] = (
            DataImportRun.objects.filter(source="import_hydroquebec").order_by("-started_at").first()
        )
        return super().changelist_view(request, extra_context)

    def get_urls(self):
        """Ajoute les routes import PFAF et enrichissement d'une espèce."""
        urls = super().get_urls()
        info = self.opts.app_label, self.opts.model_name
        custom_urls = [
            path('import-pfaf/', self.admin_site.admin_view(self.import_pfaf_view), name='%s_%s_import_pfaf' % info),
            path('enrich/<int:pk>/', self.admin_site.admin_view(self.enrich_organism_view), name='%s_%s_enrich' % info),
        ]
        return custom_urls + urls

    def enrich_organism_view(self, request, pk):
        """Enrichit un organisme depuis VASCAN, USDA et Botanipedia (bouton sur la fiche)."""
        from .enrichment import enrich_organism

        organism = self.get_object(request, str(pk))
        if organism is None:
            messages.error(request, "Organisme introuvable.")
            return HttpResponseRedirect(reverse("admin:catalog_organism_changelist"))
        if not self.has_change_permission(request, organism):
            messages.error(request, "Droits insuffisants.")
            return HttpResponseRedirect(reverse("admin:catalog_organism_changelist"))

        nom = organism.nom_commun or organism.nom_latin or f"ID {pk}"
        if not (organism.nom_latin or "").strip():
            messages.warning(request, "Enrichissement impossible : le nom latin est vide. Complétez-le puis réessayez.")
            return HttpResponseRedirect(reverse("admin:catalog_organism_change", args=[pk]))

        try:
            results = enrich_organism(organism, delay=0.6)
            ok_count = sum(1 for success, _ in results.values() if success)
            for source, (success, msg) in results.items():
                if success:
                    messages.success(request, msg)
                else:
                    messages.warning(request, msg)
            if ok_count > 0:
                messages.success(request, f"Enrichissement terminé : {ok_count} source(s) mise(s) à jour pour « {nom} ».")
        except Exception as e:
            messages.error(request, f"Erreur lors de l'enrichissement : {e}")
        return HttpResponseRedirect(reverse("admin:catalog_organism_change", args=[pk]))

    def import_pfaf_view(self, request):
        """Import PFAF désactivé sur BIOT (Radix Sylva + sync_radixsylva)."""
        if request.method == 'POST':
            messages.error(
                request,
                "L'import PFAF n'est plus disponible ici. Utiliser Radix Sylva (import_pfaf), "
                "puis : python manage.py sync_radixsylva",
            )
            return HttpResponseRedirect(reverse('admin:catalog_organism_changelist'))
        return render(
            request,
            'admin/species/organism/import_pfaf_deprecated.html',
            {
                'title': 'Import PFAF (déplacé vers Radix Sylva)',
                'opts': self.model._meta,
                'has_view_permission': self.has_view_permission(request, None),
            },
        )

    def _serializable_payload(self, row: dict) -> dict:
        """Construit un dict JSON-serialisable pour data_sources['pfaf']."""
        out = {}
        for k, v in row.items():
            if v is None:
                continue
            if isinstance(v, (str, int, float, bool)):
                out[k] = v
            else:
                out[k] = str(v)
        return out

    def _description_from_row(self, row: dict) -> str:
        parts = []
        for key in PFAF_FIELD_ALIASES['description'] + PFAF_FIELD_ALIASES['habitat']:
            v = get_row_value(row, [key], default='')
            if v:
                parts.append(v)
        return '\n\n'.join(parts) if parts else ''

    def _zone_from_row(self, row: dict) -> str:
        z = get_row_value(row, PFAF_FIELD_ALIASES['zone_rusticite'], default='', coerce_str=False)
        if z is None:
            return ''
        if isinstance(z, (int, float)):
            return str(int(z))
        return str(z).strip() if z else ''

    def _sun_from_row(self, row: dict) -> str:
        sun = get_row_value(row, PFAF_FIELD_ALIASES['sun'], default='').lower()
        if not sun:
            return ''
        if 'shade' in sun and 'sun' not in sun and 'partial' not in sun:
            return 'ombre'
        if 'partial' in sun or 'semi' in sun or 'mi-ombre' in sun or 'light shade' in sun:
            return 'mi_ombre'
        if 'full' in sun or 'sun' in sun or 'soleil' in sun or 'no shade' in sun:
            return 'plein_soleil'
        return ''

    def _water_from_row(self, row: dict) -> str:
        w = get_row_value(row, PFAF_FIELD_ALIASES['water'], default='').lower()
        if not w:
            return ''
        if 'dry' in w or 'low' in w or 'faible' in w:
            return 'faible'
        if 'wet' in w or 'high' in w or 'eleve' in w or 'moist' in w:
            return 'eleve'
        return 'moyen'

    def _type_from_row(self, row: dict) -> str:
        t = get_row_value(row, PFAF_FIELD_ALIASES['habit'], default='').lower()
        if 'tree' in t or 'arbre' in t:
            return 'arbre_ornement'
        if 'shrub' in t or 'arbuste' in t:
            return 'arbuste'
        if 'perennial' in t or 'vivace' in t:
            return 'vivace'
        if 'annual' in t or 'annuelle' in t:
            return 'annuelle'
        if 'climber' in t or 'grimpant' in t or 'vine' in t:
            return 'grimpante'
        return 'vivace'


@admin.register(UserTag)
class UserTagAdmin(admin.ModelAdmin):
    list_display = ['apercu_couleur', 'nom', 'description', 'date_creation']
    list_display_links = ['nom']
    search_fields = ['nom', 'description']
    list_filter = ['date_creation']
    
    def apercu_couleur(self, obj):
        """Affiche le tag avec sa couleur comme pastille."""
        return format_html(
            '<span style="background-color: {}; padding: 5px 15px; '
            'border-radius: 3px; color: white; font-weight: bold;">{}</span>',
            obj.couleur, obj.nom
        )
    apercu_couleur.short_description = "Tag"
    
    fieldsets = (
        ('Informations', {
            'fields': ('nom', 'couleur', 'description')
        }),
        ('Métadonnées', {
            'fields': ('date_creation',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['date_creation']

    def _serializable_payload(self, row: dict) -> dict:
        """Construit un dict JSON-serialisable pour data_sources['pfaf']."""
        out = {}
        for k, v in row.items():
            if v is None:
                continue
            if isinstance(v, (str, int, float, bool)):
                out[k] = v
            else:
                out[k] = str(v)
        return out

    def _description_from_row(self, row: dict) -> str:
        parts = []
        for key in PFAF_FIELD_ALIASES['description'] + PFAF_FIELD_ALIASES['habitat']:
            v = get_row_value(row, [key], default='')
            if v:
                parts.append(v)
        return '\n\n'.join(parts) if parts else ''

    def _zone_from_row(self, row: dict) -> str:
        z = get_row_value(row, PFAF_FIELD_ALIASES['zone_rusticite'], default='', coerce_str=False)
        if z is None:
            return ''
        if isinstance(z, (int, float)):
            return str(int(z))
        return str(z).strip() if z else ''

    def _sun_from_row(self, row: dict) -> str:
        sun = get_row_value(row, PFAF_FIELD_ALIASES['sun'], default='').lower()
        if not sun:
            return ''
        if 'shade' in sun and 'sun' not in sun and 'partial' not in sun:
            return 'ombre'
        if 'partial' in sun or 'semi' in sun or 'mi-ombre' in sun or 'light shade' in sun:
            return 'mi_ombre'
        if 'full' in sun or 'sun' in sun or 'soleil' in sun or 'no shade' in sun:
            return 'plein_soleil'
        return ''

    def _water_from_row(self, row: dict) -> str:
        w = get_row_value(row, PFAF_FIELD_ALIASES['water'], default='').lower()
        if not w:
            return ''
        if 'dry' in w or 'low' in w or 'faible' in w:
            return 'faible'
        if 'wet' in w or 'high' in w or 'eleve' in w or 'moist' in w:
            return 'eleve'
        return 'moyen'

    def _type_from_row(self, row: dict) -> str:
        t = get_row_value(row, PFAF_FIELD_ALIASES['habit'], default='').lower()
        if 'tree' in t or 'arbre' in t:
            return 'arbre_ornement'
        if 'shrub' in t or 'arbuste' in t:
            return 'arbuste'
        if 'perennial' in t or 'vivace' in t:
            return 'vivace'
        if 'annual' in t or 'annuelle' in t:
            return 'annuelle'
        if 'climber' in t or 'grimpant' in t or 'vine' in t:
            return 'grimpante'
        return 'vivace'

class SprinklerZoneInline(admin.TabularInline):
    model = SprinklerZone
    extra = 0
    fields = ('nom', 'type_integration', 'webhook_url', 'duree_defaut_minutes', 'actif', 'annuler_si_pluie_prevue')


class ZoneInline(admin.TabularInline):
    model = Zone
    extra = 0
    fields = ('nom', 'type', 'boundary', 'surface_m2', 'couleur', 'ordre')


@admin.register(Garden)
class GardenAdmin(admin.ModelAdmin):
    change_list_template = "admin/species/garden/change_list.html"
    change_form_template = "admin/species/garden/change_form.html"
    list_display = ['nom', 'ville', 'adresse_courte', 'pluie_semaine_display', 'a_coordonnees', 'nb_specimens', 'vue_3d_link']
    list_filter = ['ville', 'pays']
    search_fields = ['nom', 'adresse', 'ville', 'notes']
    inlines = [SprinklerZoneInline, ZoneInline]
    fieldsets = (
        ('Identification', {
            'fields': ('nom',)
        }),
        ('Adresse', {
            'fields': ('adresse', 'ville', 'code_postal', 'pays')
        }),
        ('Coordonnées (météo)', {
            'fields': ('latitude', 'longitude', 'timezone', 'pluie_semaine_display'),
            'description': 'Coordonnées pour la météo (Open-Meteo). Option 1 : remplir adresse/ville/code postal ci-dessus, enregistrer, puis cliquer "Remplir lat/long depuis l\'adresse" dans la barre d\'outils. Option 2 : saisir lat/long manuellement.'
        }),
        ('Seuils alerte arrosage', {
            'fields': ('seuil_temp_chaud_c', 'seuil_pluie_faible_mm', 'jours_periode_analyse'),
            'classes': ('collapse',)
        }),
        ('Seuils prévision', {
            'fields': (
                'jours_sans_pluie_prevision', 'seuil_gel_c', 'seuil_pluie_forte_mm',
                'seuil_temp_elevee_c', 'zone_rusticite',
            ),
            'description': 'Prévision : pas de pluie N jours, gel, forte pluie, température élevée, zone hiver.',
            'classes': ('collapse',)
        }),
        ('Unité d\'affichage', {
            'fields': ('distance_unit',),
            'description': 'Unité par défaut pour ce jardin (mètres ou pieds). La vue 3D peut basculer temporairement.',
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
    )

    def adresse_courte(self, obj):
        if obj.ville:
            return f"{obj.ville}, {obj.pays}"
        return obj.adresse[:50] + '...' if len(obj.adresse or '') > 50 else (obj.adresse or '-')
    adresse_courte.short_description = "Lieu"

    def a_coordonnees(self, obj):
        return "✓" if obj.latitude and obj.longitude else "—"
    a_coordonnees.short_description = "Coords"

    def nb_specimens(self, obj):
        return obj.specimens.count()
    nb_specimens.short_description = "Spécimens"

    def vue_3d_link(self, obj):
        if not obj or not obj.pk:
            return "—"
        url = reverse('cesium-terrain') + f'?garden_id={obj.pk}'
        return format_html('<a href="{}" target="_blank" rel="noopener">🗺️ Vue 3D</a>', url)
    vue_3d_link.short_description = "3D"

    def pluie_semaine_display(self, obj):
        if not obj or not obj.pk:
            return "—"
        mm = obj.pluie_semaine_mm()
        if mm is None:
            return "—"  # Pas de données météo
        return f"{mm} mm"
    pluie_semaine_display.short_description = "Pluie 7 jours"

    readonly_fields = ['pluie_semaine_display']


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ['nom', 'garden', 'type', 'surface_m2', 'couleur', 'ordre', 'date_creation']
    list_filter = ['type', 'garden']
    search_fields = ['nom', 'garden__nom']
    autocomplete_fields = ['garden']
    ordering = ['garden', 'ordre', 'nom']


@admin.register(SprinklerZone)
class SprinklerZoneAdmin(admin.ModelAdmin):
    list_display = ['nom', 'garden', 'type_integration', 'actif', 'annuler_si_pluie_prevue', 'webhook_url_court']
    list_filter = ['garden', 'type_integration', 'actif']
    search_fields = ['nom', 'webhook_url']
    autocomplete_fields = ['garden']

    def webhook_url_court(self, obj):
        url = obj.webhook_url or ''
        return url[:40] + '...' if len(url) > 40 else url or '-'
    webhook_url_court.short_description = "Webhook"


@admin.register(WeatherRecord)
class WeatherRecordAdmin(admin.ModelAdmin):
    change_list_template = "admin/species/weatherrecord/change_list.html"
    list_display = ['garden', 'date', 'temp_max', 'temp_min', 'temp_mean', 'precipitation_mm', 'rain_mm', 'snowfall_cm']
    list_filter = ['garden', 'date']
    date_hierarchy = 'date'
    autocomplete_fields = ['garden']


class CultivarPollinatorInline(admin.TabularInline):
    model = CultivarPollinator
    extra = 0
    fk_name = 'cultivar'
    autocomplete_fields = ['companion_cultivar', 'companion_organism']
    fields = ('companion_cultivar', 'companion_organism', 'notes', 'source')


class CultivarPorteGreffeInline(admin.TabularInline):
    model = CultivarPorteGreffe
    extra = 0
    fk_name = 'cultivar'
    fields = ('nom_porte_greffe', 'vigueur', 'hauteur_max_m', 'disponible_chez', 'notes', 'source')
    verbose_name = "Porte-greffe"
    verbose_name_plural = "Porte-greffes"


@admin.register(Cultivar)
class CultivarAdmin(admin.ModelAdmin):
    list_display = ['slug_cultivar', 'nom', 'organism', 'couleur_fruit', 'date_ajout']
    list_filter = ['organism']
    search_fields = ['nom', 'slug_cultivar', 'organism__nom_latin', 'organism__nom_commun']
    autocomplete_fields = ['organism']
    readonly_fields = ['date_ajout', 'date_modification']
    inlines = [CultivarPorteGreffeInline, CultivarPollinatorInline]


@admin.register(CultivarPollinator)
class CultivarPollinatorAdmin(admin.ModelAdmin):
    list_display = ['cultivar', 'companion_cultivar', 'companion_organism', 'source']
    list_filter = ['cultivar__organism']
    search_fields = ['cultivar__nom', 'notes']
    autocomplete_fields = ['cultivar', 'companion_cultivar', 'companion_organism']


class SpecimenGroupMemberInline(admin.TabularInline):
    model = SpecimenGroupMember
    extra = 0
    autocomplete_fields = ['specimen']
    fields = ('specimen', 'role')


@admin.register(SpecimenGroup)
class SpecimenGroupAdmin(admin.ModelAdmin):
    list_display = ['id', 'type_groupe', 'organisme', 'date_ajout', 'members_count']
    list_filter = ['type_groupe']
    search_fields = ['organisme__nom_commun']
    autocomplete_fields = ['organisme']
    inlines = [SpecimenGroupMemberInline]
    readonly_fields = ['date_ajout']

    def members_count(self, obj):
        return obj.members.count() if obj.pk else 0
    members_count.short_description = "Membres"


@admin.register(SpecimenGroupMember)
class SpecimenGroupMemberAdmin(admin.ModelAdmin):
    list_display = ['group', 'specimen', 'role']
    list_filter = ['group__type_groupe', 'role']
    search_fields = ['specimen__nom', 'group__id']
    autocomplete_fields = ['group', 'specimen']


@admin.register(CompanionRelation)
class CompanionRelationAdmin(admin.ModelAdmin):
    change_list_template = "admin/species/companionrelation/change_list.html"

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


@admin.register(OrganismAmendment)
class OrganismAmendmentAdmin(admin.ModelAdmin):
    list_display = [
        'organisme',
        'amendment',
        'priorite',
        'dose_specifique',
        'moment_application',
    ]
    list_filter = ['priorite']
    search_fields = [
        'organisme__nom_commun',
        'organisme__nom_latin',
        'amendment__nom',
        'notes',
    ]
    autocomplete_fields = ['organisme', 'amendment']
    fieldsets = (
        (None, {
            'fields': ('organisme', 'amendment', 'priorite')
        }),
        ('Application', {
            'fields': ('dose_specifique', 'moment_application', 'notes')
        }),
    )


@admin.register(SeedSupplier)
class SeedSupplierAdmin(admin.ModelAdmin):
    list_display = ['nom', 'type_fournisseur', 'actif', 'dernier_import']
    list_filter = ['type_fournisseur', 'actif']
    search_fields = ['nom', 'contact']
    ordering = ['nom']


class SemisBatchInline(admin.TabularInline):
    model = SemisBatch
    extra = 0
    fields = ('date_semis', 'quantite_semee', 'methode', 'taux_germination_reel', 'nb_plants_obtenus')


@admin.register(SeedCollection)
class SeedCollectionAdmin(admin.ModelAdmin):
    actions = ["export_seed_collections_csv_action"]
    change_list_template = "admin/species/seedcollection/change_list.html"

    list_display = [
        'organisme', 'variete', 'lot_reference', 'fournisseur',
        'quantite_unite_display', 'stratification_display',
        'viabilite_display', 'date_ajout'
    ]
    list_filter = ['fournisseur', 'stratification_requise', 'unite']
    search_fields = [
        'organisme__nom_commun', 'organisme__nom_latin',
        'variete', 'lot_reference', 'notes'
    ]
    autocomplete_fields = ['organisme', 'fournisseur']
    inlines = [SemisBatchInline]
    date_hierarchy = 'date_ajout'

    fieldsets = (
        ('Identification', {
            'fields': ('organisme', 'variete', 'lot_reference', 'fournisseur')
        }),
        ('Quantité', {
            'fields': ('quantite', 'unite')
        }),
        ('Viabilité', {
            'fields': ('date_recolte', 'duree_vie_annees', 'germination_lab_pct')
        }),
        ('Stratification', {
            'fields': (
                'stratification_requise', 'stratification_duree_jours',
                'stratification_temp', 'stratification_notes'
            ),
            'classes': ('collapse',)
        }),
        ('Germination', {
            'fields': (
                'temps_germination_jours_min', 'temps_germination_jours_max',
                'temperature_optimal_min', 'temperature_optimal_max', 'pretraitement'
            ),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Données source', {
            'fields': ('data_sources',),
            'classes': ('collapse',)
        }),
    )

    def quantite_unite_display(self, obj):
        if obj.quantite is not None:
            return f"{obj.quantite} {obj.get_unite_display()}"
        return "-"
    quantite_unite_display.short_description = "Quantité"

    def stratification_display(self, obj):
        if not obj.stratification_requise:
            return "—"
        s = f"{obj.stratification_duree_jours or '?'} j"
        if obj.stratification_temp:
            s += f" ({obj.get_stratification_temp_display()})"
        return s
    stratification_display.short_description = "Stratification"

    def viabilite_display(self, obj):
        if obj.date_recolte and obj.duree_vie_annees:
            perime = obj.est_potentiellement_perime()
            return "⚠️ Périmé" if perime else "✓ OK"
        return "-"
    viabilite_display.short_description = "Viabilité"

    @admin.action(description="Exporter en CSV")
    def export_seed_collections_csv_action(self, request, queryset):
        return export_seed_collections_csv(queryset)

    def changelist_view(self, request, extra_context=None):
        if request.GET.get("export") == "csv":
            get_copy = request.GET.copy()
            if "export" in get_copy:
                del get_copy["export"]
            request.GET = get_copy
            cl = self.get_changelist_instance(request)
            return export_seed_collections_csv(cl.get_queryset(request))
        extra_context = extra_context or {}
        extra_context["last_seeds_run"] = (
            DataImportRun.objects.filter(source="seeds").order_by("-started_at").first()
        )
        return super().changelist_view(request, extra_context)

    def get_urls(self):
        urls = super().get_urls()
        info = self.opts.app_label, self.opts.model_name
        custom_urls = [
            path(
                'import-csv/',
                self.admin_site.admin_view(self.import_seeds_view),
                name='%s_%s_import_csv' % info,
            ),
        ]
        return custom_urls + urls

    def import_seeds_view(self, request):
        """Vue pour l'import de semences CSV/JSON depuis l'admin."""
        from datetime import datetime

        from django.utils import timezone

        if request.method == 'POST':
            form = ImportSeedsForm(request.POST, request.FILES)
            if form.is_valid():
                uploaded_file = form.cleaned_data['file']
                supplier = form.cleaned_data.get('supplier')
                limit = form.cleaned_data.get('limit') or 0
                update_existing = form.cleaned_data.get('update_existing') or False

                with tempfile.NamedTemporaryFile(delete=False, suffix=Path(uploaded_file.name).suffix) as tmp_file:
                    for chunk in uploaded_file.chunks():
                        tmp_file.write(chunk)
                    tmp_path = Path(tmp_file.name)

                run = None
                try:
                    data = load_seed_data(tmp_path)
                    if not data:
                        messages.warning(request, 'Aucune donnée trouvée dans le fichier.')
                        return HttpResponseRedirect(reverse('admin:catalog_seedcollection_import_csv'))
                    if limit > 0:
                        data = data[:limit]

                    run = DataImportRun.objects.create(
                        source='seeds',
                        status='running',
                        trigger='admin_import',
                        user=request.user,
                    )

                    created_org, created_seed, updated_seed, skipped, errors = 0, 0, 0, 0, 0

                    for idx, row in enumerate(data, 1):
                        try:
                            nom_latin = seed_get_row_value(row, SEED_FIELD_ALIASES['latin_name'], default='')
                            nom_commun = seed_get_row_value(row, SEED_FIELD_ALIASES['common_name'], default='')
                            if not nom_latin and not nom_commun:
                                skipped += 1
                                continue

                            organisme, org_created = find_or_match_organism(
                                Organism,
                                nom_latin=nom_latin,
                                nom_commun=nom_commun or nom_latin,
                                defaults={
                                    'nom_commun': nom_commun or nom_latin,
                                    'famille': seed_get_row_value(row, SEED_FIELD_ALIASES['family'], default=''),
                                    'regne': 'plante',
                                    'type_organisme': 'vivace',
                                }
                            )
                            if org_created:
                                created_org += 1

                            variete = seed_get_row_value(row, SEED_FIELD_ALIASES['variete'], default='').strip()
                            lot = seed_get_row_value(row, SEED_FIELD_ALIASES['lot_reference'], default='').strip()
                            qs = SeedCollection.objects.filter(organisme=organisme)
                            qs = qs.filter(variete=variete) if variete else qs.filter(variete='')
                            qs = qs.filter(lot_reference=lot) if lot else qs.filter(lot_reference='')
                            existing = qs.first()

                            if existing and not update_existing:
                                skipped += 1
                                continue

                            def _parse_date(val):
                                if not val:
                                    return None
                                s = str(val).strip()
                                if not s:
                                    return None
                                try:
                                    y = int(s[:4])
                                    if 1900 <= y <= 2100:
                                        from datetime import date
                                        return date(y, 1, 1)
                                except (ValueError, IndexError):
                                    pass
                                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%Y'):
                                    try:
                                        return datetime.strptime(s, fmt).date()
                                    except ValueError:
                                        continue
                                return None

                            def _parse_strat_temp(val):
                                if not val:
                                    return ''
                                v = str(val).lower()
                                if 'froid' in v or 'cold' in v:
                                    return 'froide'
                                if 'chaud' in v or 'warm' in v or 'hot' in v:
                                    return 'chaude_puis_froide' if 'puis' in v or 'then' in v else 'chaude'
                                return ''

                            def _parse_unite(val):
                                if not val:
                                    return 'graines'
                                v = str(val).lower().strip()
                                m = {'g': 'g', 'grammes': 'g', 'ml': 'ml', 'sachet': 'sachet', 's': 'sachet'}
                                return m.get(v, 'graines')

                            seed_data = {
                                'organisme': organisme,
                                'variete': variete,
                                'lot_reference': lot,
                                'fournisseur': supplier,
                                'quantite': parse_float(seed_get_row_value(row, SEED_FIELD_ALIASES['quantite'], default=None, coerce_str=False)),
                                'unite': _parse_unite(seed_get_row_value(row, SEED_FIELD_ALIASES['unite'], default='graines')),
                                'date_recolte': _parse_date(seed_get_row_value(row, SEED_FIELD_ALIASES['date_recolte'], default='')),
                                'duree_vie_annees': parse_float(seed_get_row_value(row, SEED_FIELD_ALIASES['duree_vie_annees'], default=None, coerce_str=False)),
                                'germination_lab_pct': parse_float(seed_get_row_value(row, SEED_FIELD_ALIASES['germination_lab_pct'], default=None, coerce_str=False)),
                                'stratification_requise': parse_bool(seed_get_row_value(row, SEED_FIELD_ALIASES['stratification_requise'], default='')),
                                'stratification_duree_jours': parse_int_or_range(seed_get_row_value(row, SEED_FIELD_ALIASES['stratification_duree_jours'], default=None, coerce_str=False)),
                                'stratification_temp': _parse_strat_temp(seed_get_row_value(row, SEED_FIELD_ALIASES['stratification_temp'], default='')),
                                'stratification_notes': seed_get_row_value(row, SEED_FIELD_ALIASES['stratification_notes'], default=''),
                                'temps_germination_jours_min': parse_int(seed_get_row_value(row, SEED_FIELD_ALIASES['temps_germination_jours_min'], default=None, coerce_str=False)),
                                'temps_germination_jours_max': parse_int_or_range(seed_get_row_value(row, SEED_FIELD_ALIASES['temps_germination_jours_max'], default=None, coerce_str=False)),
                                'temperature_optimal_min': parse_float(seed_get_row_value(row, SEED_FIELD_ALIASES['temperature_optimal_min'], default=None, coerce_str=False)),
                                'temperature_optimal_max': parse_float(seed_get_row_value(row, SEED_FIELD_ALIASES['temperature_optimal_max'], default=None, coerce_str=False)),
                                'pretraitement': seed_get_row_value(row, SEED_FIELD_ALIASES['pretraitement'], default=''),
                                'data_sources': {'import': {k: (v if isinstance(v, (str, int, float, bool)) else str(v)) for k, v in row.items() if v is not None}},
                            }

                            if existing:
                                for k, v in seed_data.items():
                                    if k == 'organisme':
                                        continue
                                    if k == 'data_sources':
                                        existing.data_sources = dict(existing.data_sources or {})
                                        existing.data_sources['import'] = v.get('import', v)
                                        continue
                                    setattr(existing, k, v)
                                existing.save()
                                updated_seed += 1
                            else:
                                SeedCollection.objects.create(**seed_data)
                                created_seed += 1

                        except Exception:
                            errors += 1

                    if supplier and (created_seed + updated_seed) > 0:
                        supplier.dernier_import = timezone.now()
                        supplier.save(update_fields=['dernier_import'])

                    if run:
                        run.status = 'success'
                        run.finished_at = timezone.now()
                        run.stats = {
                            'created_org': created_org,
                            'created_seed': created_seed,
                            'updated_seed': updated_seed,
                            'skipped': skipped,
                            'errors': errors,
                        }
                        if supplier:
                            run.stats['supplier_id'] = supplier.pk
                            run.stats['supplier_name'] = supplier.nom
                        run.save()

                    msg = (
                        f'Import terminé: {created_seed} créées, {updated_seed} mises à jour, '
                        f'{created_org} organismes créés, {skipped} ignorées'
                    )
                    if errors:
                        msg += f', {errors} erreurs'
                    messages.success(request, msg)
                    return HttpResponseRedirect(reverse('admin:catalog_seedcollection_changelist'))

                except Exception as e:
                    if run:
                        run.status = 'failure'
                        run.finished_at = timezone.now()
                        run.output_snippet = str(e)[:2000]
                        run.stats = {}
                        run.save()
                    messages.error(request, f'Erreur lors de l\'import: {str(e)}')
                finally:
                    if tmp_path.exists():
                        tmp_path.unlink()
        else:
            form = ImportSeedsForm()

        context = {
            'form': form,
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request, None),
            'title': 'Importer des semences (CSV/JSON)',
        }
        return render(request, 'admin/species/seedcollection/import_seeds.html', context)


@admin.register(SemisBatch)
class SemisBatchAdmin(admin.ModelAdmin):
    list_display = ['seed_collection', 'date_semis', 'methode', 'taux_germination_reel', 'nb_plants_obtenus']
    list_filter = ['methode', 'date_semis']
    search_fields = ['seed_collection__organisme__nom_commun', 'notes']
    autocomplete_fields = ['seed_collection']
    date_hierarchy = 'date_semis'


@admin.register(Specimen)
class SpecimenAdmin(admin.ModelAdmin):
    inlines = [EventSpecimenInline, ReminderSpecimenInline, PhotoSpecimenInline]
    actions = ["export_specimens_csv_action"]
    change_list_template = "admin/species/specimen/change_list.html"
    change_form_template = "admin/species/specimen/change_form.html"

    list_display = [
        'nom',
        'organisme',
        'cultivar',
        'garden',
        'zone_jardin',
        'statut',
        'date_plantation',
        'age_display',
        'sante_stars'
    ]
    
    list_filter = [
        'statut',
        'source',
        'garden',
        'zone_jardin',
        'organisme__type_organisme',
        'date_plantation'
    ]
    
    search_fields = [
        'nom',
        'code_identification',
        'nfc_tag_uid',
        'organisme__nom_commun',
        'organisme__nom_latin',
        'notes'
    ]
    
    autocomplete_fields = ['organisme', 'seed_collection', 'garden']
    
    date_hierarchy = 'date_plantation'
    
    fieldsets = (
        ('Identification', {
            'fields': ('organisme', 'nom', 'code_identification', 'nfc_tag_uid')
        }),
        ('Localisation', {
            'fields': ('garden', 'zone', 'zone_jardin', 'latitude', 'longitude')
        }),
        ('Plantation', {
            'fields': (
                'date_plantation', 'age_plantation', 'source',
                'pepiniere_fournisseur', 'seed_collection'
            )
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

    @admin.action(description="Exporter en CSV")
    def export_specimens_csv_action(self, request, queryset):
        return export_specimens_csv(queryset)

    def changelist_view(self, request, extra_context=None):
        if request.GET.get("export") == "csv":
            get_copy = request.GET.copy()
            if "export" in get_copy:
                del get_copy["export"]
            request.GET = get_copy
            cl = self.get_changelist_instance(request)
            return export_specimens_csv(cl.get_queryset(request))
        return super().changelist_view(request, extra_context)

    def get_urls(self):
        urls = super().get_urls()
        info = self.opts.app_label, self.opts.model_name
        custom = [
            path(
                '<path:object_id>/duplicate/',
                self.admin_site.admin_view(self.duplicate_specimen_view),
                name='%s_%s_duplicate' % info,
            ),
        ]
        return custom + urls

    def duplicate_specimen_view(self, request, object_id):
        """Crée une copie du spécimen et redirige vers son formulaire d'édition."""
        from django.shortcuts import get_object_or_404
        specimen = get_object_or_404(Specimen, pk=object_id)
        copy_fields = [
            'organisme', 'garden', 'zone', 'zone_jardin', 'latitude', 'longitude',
            'date_plantation', 'age_plantation', 'source', 'pepiniere_fournisseur',
            'seed_collection', 'statut', 'sante', 'hauteur_actuelle',
            'premiere_fructification', 'notes',
        ]
        data = {f: getattr(specimen, f) for f in copy_fields}
        data['nom'] = f"{specimen.nom} (copie)"
        data['code_identification'] = None
        data['nfc_tag_uid'] = None
        new_specimen = Specimen.objects.create(**data)
        messages.success(request, f'Spécimen dupliqué : "{new_specimen.nom}"')
        url = reverse('admin:species_specimen_change', args=[new_specimen.pk])
        return HttpResponseRedirect(url)

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'specimen', 'type_rappel', 'date_rappel', 'recurrence_rule', 'type_alerte', 'titre', 'date_ajout',
    ]
    list_filter = ['type_rappel', 'type_alerte']
    search_fields = ['specimen__nom', 'titre', 'description']
    autocomplete_fields = ['specimen']
    date_hierarchy = 'date_rappel'
    ordering = ['date_rappel', 'date_ajout']


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
        'type_photo',
        'titre',
        'date_prise',
        'date_ajout'
    ]
    
    list_filter = [
        'type_photo',
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
    
    readonly_fields = ['image_preview']
    
    fieldsets = (
        ('Image', {
            'fields': ('image_preview', 'image', 'type_photo', 'titre', 'description', 'date_prise')
        }),
        ('Attribution (Wikimedia, etc.)', {
            'fields': ('source_url', 'source_author', 'source_license'),
            'classes': ('collapse',),
        }),
        ('Lié à', {
            'fields': ('organisme', 'specimen', 'event')
        }),
    )
    
    def miniature(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="80" height="80" style="object-fit: cover; border-radius: 4px;" />',
                obj.image.url
            )
        return "-"
    miniature.short_description = ""

    def image_preview(self, obj):
        """Large preview of the image on the change form."""
        if obj and obj.image:
            return format_html(
                '<img src="{}" style="max-width: 560px; max-height: 420px; width: auto; height: auto; '
                'object-fit: contain; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" alt="Aperçu" />',
                obj.image.url
            )
        return format_html('<p style="color: #888;">Aucune image — enregistrez pour voir l’aperçu.</p>')
    image_preview.short_description = "Aperçu"

    def get_sujet(self, obj):
        if obj.specimen:
            return f"🌳 {obj.specimen.nom}"
        elif obj.organisme:
            return f"📚 {obj.organisme.nom_commun}"
        elif obj.event:
            return f"📅 {obj.event}"
        return "-"
    get_sujet.short_description = "Sujet"


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ['nom', 'url', 'ordre', 'actif']
    list_editable = ['ordre', 'actif']
    list_filter = ['actif']
    search_fields = ['nom', 'url']
    ordering = ['ordre', 'nom']


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'default_garden']
    list_filter = ['default_garden']
    autocomplete_fields = ['user', 'default_garden']


@admin.register(DataImportRun)
class DataImportRunAdmin(admin.ModelAdmin):
    list_display = ['source', 'status', 'started_at', 'finished_at', 'trigger', 'user']
    list_filter = ['source', 'status', 'trigger']
    search_fields = ['output_snippet']
    readonly_fields = [
        'source', 'status', 'started_at', 'finished_at', 'stats', 'output_snippet', 'trigger', 'user',
    ]
    date_hierarchy = 'started_at'
    ordering = ['-started_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False