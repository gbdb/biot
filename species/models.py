from django.db import models

class Species(models.Model):
    """Modèle d'une espèce de plante"""
    
    # Champs de base
    nom_commun = models.CharField(max_length=200)
    nom_latin = models.CharField(max_length=200)
    famille = models.CharField(max_length=100, blank=True)
    
    # Besoins de la plante
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
    
    # Caractéristiques
    hauteur_max = models.FloatField(
        help_text="Hauteur maximale en mètres",
        null=True,
        blank=True
    )
    
    zone_rusticite = models.CharField(
        max_length=10,
        blank=True,
        help_text="Ex: 4a, 5b"
    )
    
    # Métadonnées
    date_ajout = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Espèce"
        verbose_name_plural = "Espèces"
        ordering = ['nom_commun']
    
    def __str__(self):
        """Représentation texte de l'objet"""
        return f"{self.nom_commun} ({self.nom_latin})"