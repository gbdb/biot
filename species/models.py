from django.db import models

class Species(models.Model):
    """Modèle d'une espèce de plante"""
    
    # === IDENTIFICATION ===
    nom_commun = models.CharField(max_length=200)
    nom_latin = models.CharField(max_length=200)
    famille = models.CharField(max_length=100, blank=True)
    
    # === TYPE DE PLANTE ===
    TYPE_CHOICES = [
        ('arbre', 'Arbre'),
        ('arbuste', 'Arbuste'),
        ('vivace', 'Plante vivace'),
        ('annuelle', 'Plante annuelle'),
        ('herbe', 'Herbe aromatique'),
        ('légume', 'Légume'),
    ]
    type_plante = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='vivace'
    )
    
    # === BESOINS CULTURAUX ===
    BESOIN_EAU_CHOICES = [
        ('faible', 'Faible'),
        ('moyen', 'Moyen'),
        ('élevé', 'Élevé'),
    ]
    besoin_eau = models.CharField(
        max_length=10,
        choices=BESOIN_EAU_CHOICES,
        default='moyen'
    )
    
    BESOIN_SOLEIL_CHOICES = [
        ('ombre', 'Ombre'),
        ('mi-ombre', 'Mi-ombre'),
        ('soleil', 'Plein soleil'),
    ]
    besoin_soleil = models.CharField(
        max_length=10,
        choices=BESOIN_SOLEIL_CHOICES,
        default='soleil'
    )
    
    zone_rusticite = models.CharField(
        max_length=10,
        blank=True,
        help_text="Ex: 4a, 5b"
    )
    
    # === CARACTÉRISTIQUES PHYSIQUES ===
    hauteur_max = models.FloatField(
        help_text="Hauteur maximale en mètres",
        null=True,
        blank=True
    )
    
    largeur_max = models.FloatField(
        help_text="Largeur maximale en mètres",
        null=True,
        blank=True
    )
    
    # === COMESTIBILITÉ ===
    comestible = models.BooleanField(default=True)
    parties_comestibles = models.TextField(
        blank=True,
        help_text="Ex: fruits, feuilles, racines, fleurs"
    )
    
    # === SPÉCIFIQUE ARBRES FRUITIERS ===
    age_fructification = models.IntegerField(
        null=True,
        blank=True,
        help_text="Années avant première fructification"
    )
    
    periode_recolte = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ex: Juillet-Septembre"
    )
    
    pollinisation = models.CharField(
        max_length=200,
        blank=True,
        help_text="Auto-fertile, besoin pollinisateur, variétés compatibles"
    )
    
    # === INFORMATIONS TEXTE ===
    description = models.TextField(
        blank=True,
        help_text="Description générale"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Notes personnelles"
    )
    
    # === DONNÉES EXTERNES (FLEXIBLE!) ===
    data_sources = models.JSONField(
        default=dict,
        blank=True,
        help_text="Données provenant de sources externes (structure libre)"
    )
    
    # === MÉTADONNÉES ===
    date_ajout = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Espèce"
        verbose_name_plural = "Espèces"
        ordering = ['nom_commun']
    
    def __str__(self):
        return f"{self.nom_commun} ({self.nom_latin})"