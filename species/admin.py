import tempfile
from pathlib import Path

from django.contrib import admin
from django.contrib import messages
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import path, reverse
from django.utils.html import format_html

from .export_utils import (
    export_organisms_csv_simple,
    export_organisms_pdf,
    export_specimens_csv,
    export_seed_collections_csv,
)
from .forms import ImportPFAFForm
from .models import (
    Organism, UserTag, CompanionRelation, Amendment, OrganismAmendment,
    Specimen, Event, Photo,
    SeedSupplier, SeedCollection, SemisBatch,
    Garden, WeatherRecord, SprinklerZone,
)


class PhotoOrganismInline(admin.TabularInline):
    """Inline pour ajouter plusieurs photos à un organisme depuis sa fiche."""
    model = Photo
    fk_name = 'organisme'
    extra = 1
    fields = ('image', 'type_photo', 'titre', 'date_prise')
    verbose_name = "Photo de l'espèce"
    verbose_name_plural = "Photos de l'espèce"


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
    inlines = [PhotoOrganismInline]
    actions = ["export_organismes_csv", "export_organismes_pdf"]
    change_list_template = "admin/species/organism/change_list.html"

    list_display = [
        'nom_commun',
        'nom_latin', 
        'regne',
        'type_organisme',
        'besoin_eau',
        'besoin_soleil',
        'zones_display',
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
        'mes_tags',
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
        ('Ma Collection', {
            'fields': ('mes_tags',)
        }),
        ('Informations', {
            'fields': ('description', 'notes', 'usages_autres')
        }),
        ('Données Externes', {
            'fields': ('data_sources',),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ['mes_tags']

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
        if request.GET.get("export") == "csv":
            cl = self.get_changelist_instance(request)
            return export_organisms_csv_simple(cl.get_queryset(request))
        if request.GET.get("export") == "pdf":
            from django.http import HttpResponse
            cl = self.get_changelist_instance(request)
            pdf_bytes = export_organisms_pdf(cl.get_queryset(request))
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = 'attachment; filename="organismes.pdf"'
            return response
        return super().changelist_view(request, extra_context)

    def get_urls(self):
        """Ajoute la route pour l'import PFAF."""
        urls = super().get_urls()
        custom_urls = [
            path('import-pfaf/', self.admin_site.admin_view(self.import_pfaf_view), name='species_organism_import_pfaf'),
        ]
        return custom_urls + urls

    def import_pfaf_view(self, request):
        """Vue pour l'import PFAF depuis l'admin."""
        if request.method == 'POST':
            form = ImportPFAFForm(request.POST, request.FILES)
            if form.is_valid():
                uploaded_file = form.cleaned_data['file']
                limit = form.cleaned_data['limit'] or 0
                merge_mode = form.cleaned_data['merge_mode']
                table = form.cleaned_data['table'] or 'plant_data'

                # Sauvegarder temporairement le fichier uploadé
                with tempfile.NamedTemporaryFile(delete=False, suffix=Path(uploaded_file.name).suffix) as tmp_file:
                    for chunk in uploaded_file.chunks():
                        tmp_file.write(chunk)
                    tmp_path = Path(tmp_file.name)

                try:
                    # Charger les données
                    data = load_pfaf_data(tmp_path, db_table=table)
                    
                    if not data:
                        messages.warning(request, 'Aucune donnée trouvée dans le fichier.')
                        return HttpResponseRedirect(reverse('admin:species_organism_import_pfaf'))
                    
                    if limit > 0:
                        data = data[:limit]

                    # Validation: vérifier les colonnes disponibles et critiques
                    validation_warnings = []
                    validation_passed = True
                    if data:
                        available_cols = get_available_columns(data)
                        nom_latin_found = get_row_value(data[0], PFAF_FIELD_ALIASES['latin_name'], default=None)
                        nom_commun_found = get_row_value(data[0], PFAF_FIELD_ALIASES['common_name'], default=None)
                        
                        if not nom_latin_found and not nom_commun_found:
                            validation_passed = False
                            warning_msg = (
                                f'ATTENTION: ni nom_latin ni nom_commun trouvés dans la première ligne. '
                                f'Colonnes disponibles: {", ".join(available_cols[:15])}{"..." if len(available_cols) > 15 else ""}'
                            )
                            # Suggérer des colonnes similaires
                            similar_latin = [c for c in available_cols if 'latin' in c or 'scientific' in c or 'species' in c or 'binomial' in c]
                            similar_common = [c for c in available_cols if 'common' in c or 'name' in c or 'vernacular' in c or 'english' in c]
                            if similar_latin:
                                warning_msg += f' Colonnes similaires à "latin_name": {", ".join(similar_latin)}'
                            if similar_common:
                                warning_msg += f' Colonnes similaires à "common_name": {", ".join(similar_common)}'
                            validation_warnings.append(warning_msg)

                    # Traiter l'import
                    created = 0
                    updated = 0
                    skipped = 0
                    skipped_empty_names = 0
                    errors = []
                    error_details = []  # Pour stocker plus de détails sur les erreurs

                    for idx, row in enumerate(data, 1):
                        try:
                            nom_latin = get_row_value(row, PFAF_FIELD_ALIASES['latin_name'], default='')
                            nom_commun = get_row_value(row, PFAF_FIELD_ALIASES['common_name'], default='')
                            
                            # Si ni nom_latin ni nom_commun, on ne peut pas importer
                            if not nom_latin and not nom_commun:
                                skipped += 1
                                skipped_empty_names += 1
                                # Stocker les détails pour les premières lignes ignorées
                                if skipped_empty_names <= 3:
                                    available_cols = list(row.keys())
                                    error_details.append(
                                        f'Ligne {idx}: nom_latin et nom_commun vides. '
                                        f'Colonnes: {", ".join(available_cols[:10])}'
                                    )
                                continue

                            famille = get_row_value(row, PFAF_FIELD_ALIASES['family'], default='')
                            description = self._description_from_row(row)
                            zone_raw = self._zone_from_row(row)
                            besoin_soleil = self._sun_from_row(row)
                            besoin_eau = self._water_from_row(row)
                            hauteur_raw = get_row_value(row, PFAF_FIELD_ALIASES['height'], default=None, coerce_str=False)
                            hauteur_max = None
                            if hauteur_raw is not None:
                                try:
                                    if isinstance(hauteur_raw, str):
                                        hauteur_raw = hauteur_raw.replace(',', '.')
                                    hauteur_max = float(hauteur_raw)
                                except (TypeError, ValueError):
                                    pass

                            # Chercher ou créer l'organisme avec matching intelligent
                            organism, est_nouveau = find_or_match_organism(
                                Organism,
                                nom_latin=nom_latin,
                                nom_commun=nom_commun or nom_latin,
                                defaults={
                                    'nom_commun': nom_commun or nom_latin,
                                    'famille': famille,
                                    'regne': 'plante',
                                    'type_organisme': self._type_from_row(row),
                                    'besoin_soleil': besoin_soleil,
                                    'besoin_eau': besoin_eau,
                                    'hauteur_max': hauteur_max,
                                    'description': description,
                                    'parties_comestibles': get_row_value(
                                        row, PFAF_FIELD_ALIASES['edible_parts'], default=''
                                    ),
                                    'usages_autres': get_row_value(
                                        row, PFAF_FIELD_ALIASES['uses'], default=''
                                    ),
                                    'toxicite': get_row_value(
                                        row, PFAF_FIELD_ALIASES['toxicite'], default=''
                                    ),
                                }
                            )
                            
                            # Gérer fixateur_azote
                            fixateur = get_row_value(
                                row, PFAF_FIELD_ALIASES['fixateur_azote'], default=''
                            ).lower()
                            if fixateur and ('y' in fixateur or 'yes' in fixateur or 'oui' in fixateur or '1' in fixateur):
                                if not organism.fixateur_azote:
                                    organism.fixateur_azote = True
                            
                            # Gérer les zones de rusticité (format JSONField avec source)
                            current_zones = list(organism.zone_rusticite or [])
                            if zone_raw:
                                updated_zones = merge_zones_rusticite(
                                    current_zones,
                                    zone_raw,
                                    SOURCE_PFAF
                                )
                            else:
                                updated_zones = current_zones
                            
                            # Préparer les mises à jour selon le mode de merge
                            update_fields = {}
                            
                            if merge_mode == MERGE_FILL_GAPS:
                                # Ne mettre à jour que les champs vides
                                current = {k: getattr(organism, k, None) for k in [
                                    'famille', 'besoin_eau', 'besoin_soleil', 'hauteur_max',
                                    'description', 'parties_comestibles', 'usages_autres', 'toxicite'
                                ]}
                                defaults_to_apply = {
                                    'famille': famille,
                                    'besoin_soleil': besoin_soleil,
                                    'besoin_eau': besoin_eau,
                                    'hauteur_max': hauteur_max,
                                    'description': description,
                                    'parties_comestibles': get_row_value(
                                        row, PFAF_FIELD_ALIASES['edible_parts'], default=''
                                    ),
                                    'usages_autres': get_row_value(
                                        row, PFAF_FIELD_ALIASES['uses'], default=''
                                    ),
                                    'toxicite': get_row_value(
                                        row, PFAF_FIELD_ALIASES['toxicite'], default=''
                                    ),
                                }
                                filtered = apply_fill_gaps(current, defaults_to_apply)
                                update_fields.update(filtered)
                            else:
                                # Mode overwrite: mettre à jour tous les champs
                                update_fields.update({
                                    'famille': famille,
                                    'besoin_soleil': besoin_soleil,
                                    'besoin_eau': besoin_eau,
                                    'hauteur_max': hauteur_max,
                                    'description': description,
                                    'parties_comestibles': get_row_value(
                                        row, PFAF_FIELD_ALIASES['edible_parts'], default=''
                                    ),
                                    'usages_autres': get_row_value(
                                        row, PFAF_FIELD_ALIASES['uses'], default=''
                                    ),
                                    'toxicite': get_row_value(
                                        row, PFAF_FIELD_ALIASES['toxicite'], default=''
                                    ),
                                })
                            
                            # Toujours mettre à jour les zones (merge intelligent)
                            update_fields['zone_rusticite'] = updated_zones
                            
                            # Fusionner data_sources
                            pfaf_payload = self._serializable_payload(row)
                            existing_sources = dict(organism.data_sources or {})
                            existing_sources[SOURCE_PFAF] = pfaf_payload
                            update_fields['data_sources'] = existing_sources
                            
                            # Appliquer les mises à jour
                            for key, value in update_fields.items():
                                setattr(organism, key, value)
                            organism.save()
                            
                            if est_nouveau:
                                created += 1
                            else:
                                updated += 1
                        except Exception as e:
                            skipped += 1
                            nom_latin = get_row_value(row, PFAF_FIELD_ALIASES['latin_name'], default='?')
                            error_msg = f'{nom_latin}: {str(e)}'
                            errors.append(error_msg)
                            # Stocker les détails pour les premières erreurs
                            if len(errors) <= 5:
                                error_details.append(f'Ligne {idx}: {error_msg}')

                    # Afficher les résultats
                    result_msg = f'Import terminé: {created} créés, {updated} mis à jour, {skipped} ignorés'
                    if skipped_empty_names > 0:
                        result_msg += f' ({skipped_empty_names} noms vides, {len(errors)} erreurs)'
                    messages.success(request, result_msg)
                    
                    # Afficher les avertissements de validation
                    if validation_warnings:
                        for warning in validation_warnings:
                            messages.warning(request, warning)
                    
                    # Afficher les erreurs avec plus de détails
                    if errors:
                        error_count = len(errors)
                        if error_count <= 10:
                            # Afficher toutes les erreurs si <= 10
                            messages.error(request, f'{error_count} erreurs: {"; ".join(errors)}')
                        else:
                            # Afficher un résumé avec les premières erreurs
                            messages.error(
                                request,
                                f'{error_count} erreurs. Premières: {"; ".join(errors[:5])}... '
                                f'(voir les détails ci-dessous)'
                            )
                            # Afficher les détails dans un message séparé
                            if error_details:
                                messages.warning(
                                    request,
                                    f'Détails des erreurs: {" | ".join(error_details)}'
                                )

                    # Rediriger vers la liste des organismes
                    return HttpResponseRedirect(reverse('admin:species_organism_changelist'))
                except Exception as e:
                    messages.error(request, f'Erreur lors de l\'import: {str(e)}')
                finally:
                    # Nettoyer le fichier temporaire
                    if tmp_path.exists():
                        tmp_path.unlink()
            else:
                # Formulaire invalide, réafficher avec les erreurs
                form = ImportPFAFForm(request.POST, request.FILES)
        else:
            # GET request - afficher le formulaire vide
            form = ImportPFAFForm()

        context = {
            'form': form,
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request, None),
            'title': 'Importer PFAF',
        }
        return render(request, 'admin/species/organism/import_pfaf.html', context)

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


@admin.register(Garden)
class GardenAdmin(admin.ModelAdmin):
    change_list_template = "admin/species/garden/change_list.html"
    change_form_template = "admin/species/garden/change_form.html"
    list_display = ['nom', 'ville', 'adresse_courte', 'pluie_semaine_display', 'a_coordonnees', 'nb_specimens']
    list_filter = ['ville', 'pays']
    search_fields = ['nom', 'adresse', 'ville', 'notes']
    inlines = [SprinklerZoneInline]
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
                'zone_rusticite',
            ),
            'description': 'Prévision : pas de pluie N jours, gel, forte pluie, zone hiver.',
            'classes': ('collapse',)
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

    def pluie_semaine_display(self, obj):
        if not obj or not obj.pk:
            return "—"
        mm = obj.pluie_semaine_mm()
        if mm is None:
            return "—"  # Pas de données météo
        return f"{mm} mm"
    pluie_semaine_display.short_description = "Pluie 7 jours"

    readonly_fields = ['pluie_semaine_display']


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
            cl = self.get_changelist_instance(request)
            return export_seed_collections_csv(cl.get_queryset(request))
        return super().changelist_view(request, extra_context)


@admin.register(SemisBatch)
class SemisBatchAdmin(admin.ModelAdmin):
    list_display = ['seed_collection', 'date_semis', 'methode', 'taux_germination_reel', 'nb_plants_obtenus']
    list_filter = ['methode', 'date_semis']
    search_fields = ['seed_collection__organisme__nom_commun', 'notes']
    autocomplete_fields = ['seed_collection']
    date_hierarchy = 'date_semis'


@admin.register(Specimen)
class SpecimenAdmin(admin.ModelAdmin):
    inlines = [EventSpecimenInline, PhotoSpecimenInline]
    actions = ["export_specimens_csv_action"]
    change_list_template = "admin/species/specimen/change_list.html"

    list_display = [
        'nom',
        'organisme',
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
            'fields': ('garden', 'zone_jardin', 'latitude', 'longitude')
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
            cl = self.get_changelist_instance(request)
            return export_specimens_csv(cl.get_queryset(request))
        return super().changelist_view(request, extra_context)

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
    
    fieldsets = (
        ('Image', {
            'fields': ('image', 'type_photo', 'titre', 'description', 'date_prise')
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