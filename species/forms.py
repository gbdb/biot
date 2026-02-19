from django import forms

from species.models import SeedSupplier
from species.source_rules import MERGE_FILL_GAPS, MERGE_OVERWRITE


class ImportSeedsForm(forms.Form):
    """Formulaire pour l'import de semences (catalogues fournisseurs) depuis l'admin."""

    file = forms.FileField(
        label='Fichier à importer',
        help_text='Formats acceptés: CSV (.csv), JSON (.json)',
        required=True,
    )
    supplier = forms.ModelChoiceField(
        label='Fournisseur',
        queryset=SeedSupplier.objects.filter(actif=True).order_by('nom'),
        required=False,
        empty_label='— Aucun —',
        help_text='Associer toutes les semences importées à ce fournisseur',
    )
    limit = forms.IntegerField(
        label='Limite',
        help_text='Nombre max à importer (0 = tout)',
        required=False,
        initial=0,
        min_value=0,
    )
    update_existing = forms.BooleanField(
        label='Mettre à jour les existantes',
        required=False,
        initial=False,
        help_text='Mettre à jour les collections existantes (même organisme+variété+lot)',
    )

    def clean_file(self):
        file = self.cleaned_data.get('file')
        if file:
            name = file.name.lower()
            if not any(name.endswith(ext) for ext in ['.json', '.csv', '.txt']):
                raise forms.ValidationError('Format non supporté. Utilisez .csv ou .json')
        return file


class ImportPFAFForm(forms.Form):
    """Formulaire pour l'import PFAF depuis l'admin."""
    
    file = forms.FileField(
        label='Fichier à importer',
        help_text='Formats acceptés: JSON (.json), CSV (.csv), SQLite (.sqlite, .db)',
        required=True,
    )
    
    limit = forms.IntegerField(
        label='Limite',
        help_text='Nombre maximum d\'entrées à importer (0 = tout importer)',
        required=False,
        initial=0,
        min_value=0,
    )
    
    merge_mode = forms.ChoiceField(
        label='Mode de fusion',
        choices=[
            (MERGE_FILL_GAPS, 'Ne remplir que les champs vides (préserve Hydro-Québec)'),
            (MERGE_OVERWRITE, 'Écraser les champs existants'),
        ],
        initial=MERGE_FILL_GAPS,
        help_text='fill_gaps: préserve les données existantes. overwrite: remplace tout.',
    )
    
    table = forms.CharField(
        label='Table SQLite',
        help_text='Nom de la table (uniquement pour fichiers SQLite, défaut: plant_data)',
        required=False,
        initial='plant_data',
        max_length=100,
    )
    
    def clean_file(self):
        """Valide que le fichier a une extension supportée."""
        file = self.cleaned_data.get('file')
        if file:
            name = file.name.lower()
            valid_extensions = ['.json', '.csv', '.txt', '.sqlite', '.sqlite3', '.db']
            if not any(name.endswith(ext) for ext in valid_extensions):
                raise forms.ValidationError(
                    f'Format non supporté. Utilisez: {", ".join(valid_extensions)}'
                )
        return file
