from django import forms
from species.source_rules import MERGE_FILL_GAPS, MERGE_OVERWRITE


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
