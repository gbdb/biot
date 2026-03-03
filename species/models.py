from django.conf import settings
from django.db import models


class Organism(models.Model):
    """
    Modèle pour tout organisme vivant du jardin/forêt comestible.
    Inclut: plantes, arbres, arbustes, champignons, mousses.
    """
    
    # === IDENTIFICATION ===
    nom_commun = models.CharField(
        max_length=200,
        help_text="Ex: Pommier Dolgo, Basilic, Chanterelle"
    )
    nom_latin = models.CharField(
        max_length=200,
        help_text="Nom scientifique latin"
    )
    famille = models.CharField(
        max_length=100,
        blank=True,
        help_text="Famille botanique"
    )
    
    # === RÈGNE BIOLOGIQUE ===
    REGNE_CHOICES = [
        ('plante', 'Plante'),
        ('champignon', 'Champignon'),
        ('mousse', 'Mousse/Bryophyte'),
    ]
    regne = models.CharField(
        max_length=20,
        choices=REGNE_CHOICES,
        default='plante'
    )
    
    # === TYPE D'ORGANISME ===
    TYPE_CHOICES = [
        # Arbres
        ('arbre_fruitier', 'Arbre fruitier'),
        ('arbre_noix', 'Arbre à noix'),
        ('arbre_ornement', "Arbre d'ornement"),
        ('arbre_bois', 'Arbre forestier/bois'),
        
        # Arbustes
        ('arbuste_fruitier', 'Arbuste fruitier'),
        ('arbuste_baies', 'Arbuste à baies'),
        ('arbuste', 'Arbuste'),
        
        # Plantes herbacées
        ('vivace', 'Plante vivace'),
        ('annuelle', 'Plante annuelle'),
        ('bisannuelle', 'Plante bisannuelle'),
        ('herbe_aromatique', 'Herbe aromatique'),
        ('legume', 'Légume'),
        ('grimpante', 'Plante grimpante'),
        ('couvre_sol', 'Couvre-sol'),
        
        # Champignons
        ('champignon_comestible', 'Champignon comestible'),
        ('champignon_mycorhize', 'Champignon mycorhizien'),
        
        # Mousses
        ('mousse', 'Mousse'),
    ]
    type_organisme = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES
    )
    
    # === BESOINS CULTURAUX ===
    BESOIN_EAU_CHOICES = [
        ('tres_faible', 'Très faible (xérophyte)'),
        ('faible', 'Faible'),
        ('moyen', 'Moyen'),
        ('eleve', 'Élevé'),
        ('tres_eleve', 'Très élevé (hydrophyte)'),
    ]
    besoin_eau = models.CharField(
        max_length=15,
        choices=BESOIN_EAU_CHOICES,
        default='moyen',
        blank=True
    )
    
    BESOIN_SOLEIL_CHOICES = [
        ('ombre_complete', 'Ombre complète'),
        ('ombre', 'Ombre'),
        ('mi_ombre', 'Mi-ombre'),
        ('soleil_partiel', 'Soleil partiel'),
        ('plein_soleil', 'Plein soleil'),
    ]
    besoin_soleil = models.CharField(
        max_length=20,
        choices=BESOIN_SOLEIL_CHOICES,
        default='plein_soleil',
        blank=True
    )
    
    zone_rusticite = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste de zones avec source: [{'zone': '4a', 'source': 'hydroquebec'}, {'zone': '5b', 'source': 'pfaf'}]"
    )
    
    # === SOL ===
    SOL_TEXTURE_CHOICES = [
        ('argileux', 'Argileux'),
        ('limoneux', 'Limoneux'),
        ('sablonneux', 'Sablonneux'),
        ('loameux', 'Loameux (idéal)'),
        ('rocailleux', 'Rocailleux'),
        ('tourbeux', 'Tourbeux'),
    ]
    sol_textures = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste des textures acceptées (peut en avoir plusieurs)"
    )
    
    SOL_PH_CHOICES = [
        ('tres_acide', 'Très acide (< 5.5)'),
        ('acide', 'Acide (5.5-6.5)'),
        ('neutre', 'Neutre (6.5-7.5)'),
        ('alcalin', 'Alcalin (> 7.5)'),
    ]
    sol_ph = models.JSONField(
        default=list,
        blank=True,
        help_text="pH acceptés"
    )
    
    SOL_DRAINAGE_CHOICES = [
        ('tres_draine', 'Très drainé/sec'),
        ('bien_draine', 'Bien drainé'),
        ('humide', 'Humide'),
        ('demarais', 'Détrempé/marécageux'),
    ]
    sol_drainage = models.CharField(
        max_length=20,
        choices=SOL_DRAINAGE_CHOICES,
        blank=True
    )
    
    sol_richesse = models.CharField(
        max_length=20,
        choices=[
            ('pauvre', 'Pauvre'),
            ('moyen', 'Moyen'),
            ('riche', 'Riche/Fertile'),
        ],
        blank=True
    )
    
    # === CARACTÉRISTIQUES PHYSIQUES ===
    hauteur_max = models.FloatField(
        null=True,
        blank=True,
        help_text="Hauteur maximale en mètres"
    )
    
    largeur_max = models.FloatField(
        null=True,
        blank=True,
        help_text="Largeur/envergure maximale en mètres"
    )
    
    vitesse_croissance = models.CharField(
        max_length=20,
        choices=[
            ('tres_lente', 'Très lente'),
            ('lente', 'Lente'),
            ('moyenne', 'Moyenne'),
            ('rapide', 'Rapide'),
            ('tres_rapide', 'Très rapide'),
        ],
        blank=True
    )
    
    # === COMESTIBILITÉ ===
    comestible = models.BooleanField(
        default=True,
        help_text="Est-ce comestible pour les humains?"
    )
    
    parties_comestibles = models.TextField(
        blank=True,
        help_text="Ex: fruits, feuilles, racines, fleurs, écorce, sève"
    )
    
    toxicite = models.TextField(
        blank=True,
        help_text="Parties toxiques, précautions, préparation nécessaire"
    )
    
    # === ARBRES FRUITIERS / À NOIX ===
    TYPE_NOIX_CHOICES = [
        ('noyer', 'Noyer (noix)'),
        ('noisettier', 'Noisetier (noisettes)'),
        ('chataignier', 'Châtaignier'),
        ('amandier', 'Amandier'),
        ('pecanier', 'Pécanier'),
        ('pin_pignon', 'Pin à pignons'),
        ('caryer', 'Caryer (noix de caryer/hickory)'),
    ]
    type_noix = models.CharField(
        max_length=20,
        choices=TYPE_NOIX_CHOICES,
        blank=True
    )
    
    age_fructification = models.IntegerField(
        null=True,
        blank=True,
        help_text="Années avant première fructification/production"
    )
    
    periode_recolte = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ex: Juillet-Septembre, Octobre"
    )
    
    pollinisation = models.TextField(
        blank=True,
        help_text="Auto-fertile, besoin pollinisateur, variétés compatibles, etc."
    )
    
    production_annuelle = models.CharField(
        max_length=100,
        blank=True,
        help_text="Production moyenne à maturité (ex: 50-100 kg/an)"
    )
    
    # === CARACTÉRISTIQUES ÉCOLOGIQUES ===
    fixateur_azote = models.BooleanField(
        default=False,
        help_text="Fixe l'azote atmosphérique (légumineuse, etc.)"
    )
    
    accumulateur_dynamique = models.BooleanField(
        default=False,
        help_text="Accumule nutriments du sous-sol (consoude, ortie, etc.)"
    )
    
    mellifere = models.BooleanField(
        default=False,
        help_text="Attire les pollinisateurs (abeilles, papillons)"
    )
    
    produit_juglone = models.BooleanField(
        default=False,
        help_text="Produit juglone (toxique pour certaines plantes - noyers)"
    )
    
    indigene = models.BooleanField(
        default=False,
        help_text="Espèce indigène (originaire de la région / du territoire concerné)"
    )
    
    # === INFORMATIONS DESCRIPTIVES ===
    description = models.TextField(
        blank=True,
        help_text="Description générale"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Notes personnelles, observations"
    )
    
    usages_autres = models.TextField(
        blank=True,
        help_text="Usages non-comestibles: médicinal, artisanat, bois, etc."
    )
    
    # === DONNÉES EXTERNES (FLEXIBLE) ===
    data_sources = models.JSONField(
        default=dict,
        blank=True,
        help_text="Données de sources externes (Hydro-Québec, PFAF, etc.)"
    )
    
    # === TAGS PERSONNELS ===
    mes_tags = models.ManyToManyField(
        'UserTag',
        blank=True,
        related_name='organismes',
        help_text="Tags personnels pour organiser votre collection"
    )
    
    # === PHOTO PAR DÉFAUT (galerie espèce) ===
    photo_principale = models.ForeignKey(
        'species.Photo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='organismes_photo_principale',
        help_text="Photo affichée par défaut pour cette espèce"
    )

    # === MÉTADONNÉES ===
    date_ajout = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Organisme"
        verbose_name_plural = "Organismes"
        ordering = ['nom_commun']
    
    def __str__(self):
        if self.nom_latin:
            return f"{self.nom_commun} ({self.nom_latin})"
        return self.nom_commun
    
    def get_zones_by_source(self, source: str) -> list:
        """
        Retourne toutes les zones d'une source donnée.
        Ex: get_zones_by_source('hydroquebec') → ['4a']
        """
        if not self.zone_rusticite or not isinstance(self.zone_rusticite, list):
            return []
        return [
            z.get('zone') for z in self.zone_rusticite
            if isinstance(z, dict) and z.get('source') == source and z.get('zone')
        ]
    
    def get_primary_zone(self) -> str:
        """
        Retourne la zone la plus conservative (la plus froide) pour affichage/compatibilité.
        Si aucune zone, retourne chaîne vide.
        """
        if not self.zone_rusticite or not isinstance(self.zone_rusticite, list):
            return ''
        
        zones = [
            z.get('zone') for z in self.zone_rusticite
            if isinstance(z, dict) and z.get('zone')
        ]
        if not zones:
            return ''
        
        # Importer la fonction de tri depuis source_rules
        from .source_rules import zone_rusticite_order
        zones_sorted = sorted(zones, key=zone_rusticite_order)
        return zones_sorted[0] if zones_sorted else ''


class UserTag(models.Model):
    """
    Tags personnels pour organiser et catégoriser les organismes.
    Permet de créer des collections personnalisées (ex: "Saison 2026", "Zone ruisseau").
    """
    nom = models.CharField(
        max_length=50,
        help_text="Nom du tag (ex: 'Saison 2026', 'Priorité haute')"
    )
    couleur = models.CharField(
        max_length=7,
        default="#00AA00",
        help_text="Code couleur hexadécimal (ex: #FF0000 pour rouge)"
    )
    description = models.TextField(
        blank=True,
        help_text="Description optionnelle du tag"
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Tag personnel"
        verbose_name_plural = "Tags personnels"
        ordering = ['nom']
    
    def __str__(self):
        return self.nom
    
class CompanionRelation(models.Model):
    """
    Relations de compagnonnage et interactions écologiques entre organismes.
    Ex: Tomate + Basilic = compagnon positif
        Pommier + Trèfle = fixation azote
        Noyer + Tomate = allélopathie négative (juglone)
    """
    
    organisme_source = models.ForeignKey(
        'species.Organism',
        on_delete=models.CASCADE,
        related_name='relations_sortantes',
        help_text="Organisme qui produit l'effet"
    )
    
    organisme_cible = models.ForeignKey(
        'species.Organism',
        on_delete=models.CASCADE,
        related_name='relations_entrantes',
        help_text="Organisme qui reçoit l'effet"
    )
    
    TYPE_RELATION_CHOICES = [
        # Positives
        ('compagnon_positif', '✅ Compagnon bénéfique général'),
        ('fixateur_azote', '🌱 Fixe azote (aide croissance)'),
        ('attire_pollinisateurs', '🐝 Attire pollinisateurs'),
        ('repousse_nuisibles', '🛡️ Repousse nuisibles'),
        ('abri', '🏠 Fournit abri/ombre'),
        ('coupe_vent', '💨 Protection contre vent'),
        ('support_physique', '🪜 Support physique (tuteur vivant)'),
        ('mycorhize', '🍄 Association mycorhizienne'),
        ('accumulateur', '💎 Accumule nutriments (aide fertilité)'),
        
        # Négatives
        ('compagnon_negatif', '❌ Compagnon néfaste'),
        ('allelopathie', '☠️ Allélopathie (toxines)'),
        ('competition_eau', '💧 Compétition pour eau'),
        ('competition_lumiere', '☀️ Compétition pour lumière'),
        ('competition_nutriments', '🌿 Compétition pour nutriments'),
        ('hote_maladie', '🦠 Hôte de maladies communes'),
    ]
    
    type_relation = models.CharField(
        max_length=30,
        choices=TYPE_RELATION_CHOICES
    )
    
    force = models.IntegerField(
        default=5,
        help_text="Intensité de la relation (1=faible, 10=très forte)"
    )
    
    distance_optimale = models.FloatField(
        null=True,
        blank=True,
        help_text="Distance optimale en mètres (si pertinent)"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Description détaillée de l'interaction"
    )
    
    source_info = models.CharField(
        max_length=200,
        blank=True,
        help_text="Source de l'information (livre, article, observation)"
    )
    
    date_ajout = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Relation de compagnonnage"
        verbose_name_plural = "Relations de compagnonnage"
        unique_together = ['organisme_source', 'organisme_cible', 'type_relation']
        ordering = ['organisme_source__nom_commun']
    
    def __str__(self):
        symbole = "✅" if "positif" in self.type_relation or "attire" in self.type_relation or "fixateur" in self.type_relation else "⚠️"
        return f"{symbole} {self.organisme_source.nom_commun} → {self.organisme_cible.nom_commun} ({self.get_type_relation_display()})"
    
class SeedSupplier(models.Model):
    """
    Fournisseur de semences : semencier commercial, échange, récolte personnelle.
    Utilisé pour l'import de catalogues et la traçabilité des lots.
    """
    nom = models.CharField(
        max_length=200,
        help_text="Nom du fournisseur (ex: Semences du Portage, Récolte perso)"
    )
    site_web = models.URLField(blank=True)
    contact = models.CharField(max_length=200, blank=True)

    TYPE_CHOICES = [
        ('commercial', 'Semencier commercial'),
        ('echange', 'Grainothèque/Échange'),
        ('recolte_perso', 'Récolte personnelle'),
        ('autre', 'Autre'),
    ]
    type_fournisseur = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='commercial'
    )

    # Config de mapping pour import personnalisé (colonnes fournisseur → champs internes)
    mapping_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Config de mapping: {\"column_mapping\": {\"Latin Name\": \"nom_latin\", ...}}"
    )
    actif = models.BooleanField(default=True)
    dernier_import = models.DateTimeField(null=True, blank=True)

    date_ajout = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Fournisseur de semences"
        verbose_name_plural = "Fournisseurs de semences"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class SeedCollection(models.Model):
    """
    Lot de semences en inventaire.
    Lié à un organisme (espèce) et optionnellement à un fournisseur.
    """
    organisme = models.ForeignKey(
        'species.Organism',
        on_delete=models.PROTECT,
        related_name='seed_collections',
        help_text="Espèce de la graine"
    )
    variete = models.CharField(
        max_length=200,
        blank=True,
        help_text="Variété ou cultivar (ex: Roma VF)"
    )
    lot_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Numéro de lot ou identifiant unique"
    )
    fournisseur = models.ForeignKey(
        'species.SeedSupplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='seed_collections'
    )

    # === QUANTITÉ ===
    quantite = models.FloatField(
        null=True,
        blank=True,
        help_text="Quantité en stock"
    )
    UNITE_CHOICES = [
        ('graines', 'Graines'),
        ('g', 'Grammes'),
        ('ml', 'Millilitres'),
        ('sachet', 'Sachet'),
        ('s', 'Sachet'),
    ]
    unite = models.CharField(
        max_length=15,
        choices=UNITE_CHOICES,
        default='graines'
    )

    # === DURÉE DE VIE / VIABILITÉ ===
    date_recolte = models.DateField(
        null=True,
        blank=True,
        help_text="Date de récolte ou date de test germination"
    )
    duree_vie_annees = models.FloatField(
        null=True,
        blank=True,
        help_text="Durée de vie typique en années (ex: 2, 5)"
    )
    germination_lab_pct = models.FloatField(
        null=True,
        blank=True,
        help_text="Taux germination labo (%, si connu)"
    )

    # === STRATIFICATION ===
    stratification_requise = models.BooleanField(
        default=False,
        help_text="Semence nécessite stratification"
    )
    stratification_duree_jours = models.IntegerField(
        null=True,
        blank=True,
        help_text="Durée stratification en jours (ex: 30, 90)"
    )
    stratification_temp = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ('', '—'),
            ('froide', 'Froide (0-5°C)'),
            ('chaude', 'Chaude (15-25°C)'),
            ('chaude_puis_froide', 'Chaude puis froide'),
        ],
        help_text="Type de stratification"
    )
    stratification_notes = models.TextField(blank=True)

    # === GERMINATION ===
    temps_germination_jours_min = models.IntegerField(
        null=True,
        blank=True,
        help_text="Temps germination minimum (jours)"
    )
    temps_germination_jours_max = models.IntegerField(
        null=True,
        blank=True,
        help_text="Temps germination maximum (jours)"
    )
    temperature_optimal_min = models.FloatField(
        null=True,
        blank=True,
        help_text="Température optimale min (°C)"
    )
    temperature_optimal_max = models.FloatField(
        null=True,
        blank=True,
        help_text="Température optimale max (°C)"
    )

    # === PRÉTRAITEMENT ===
    pretraitement = models.TextField(
        blank=True,
        help_text="Scarification, trempage, etc."
    )

    # === DONNÉES FOURNISSEUR ===
    data_sources = models.JSONField(
        default=dict,
        blank=True,
        help_text="Données brutes de la source (catalogue fournisseur)"
    )

    notes = models.TextField(blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Mes Semences"
        verbose_name_plural = "Mes Semences"
        ordering = ['organisme__nom_commun', 'variete']

    def __str__(self):
        if self.variete:
            return f"{self.organisme.nom_commun} — {self.variete}"
        return str(self.organisme.nom_commun)

    def est_potentiellement_perime(self):
        """Indique si la semence pourrait être périmée (date_recolte + duree_vie)."""
        if not self.date_recolte or not self.duree_vie_annees:
            return None
        from datetime import date
        try:
            years = int(self.duree_vie_annees)
            # Approximation: année + années
            peremption = date(
                self.date_recolte.year + years,
                self.date_recolte.month,
                self.date_recolte.day
            )
            return date.today() > peremption
        except (ValueError, OverflowError):
            return None


class SemisBatch(models.Model):
    """
    Session de semis — permet de suivre germination et taux de succès.
    Lie un lot de semences aux specimens créés.
    """
    seed_collection = models.ForeignKey(
        'species.SeedCollection',
        on_delete=models.CASCADE,
        related_name='semis_batches',
        help_text="Lot de semences utilisé"
    )
    date_semis = models.DateField(help_text="Date du semis")
    quantite_semee = models.FloatField(
        null=True,
        blank=True,
        help_text="Nombre de graines ou quantité semée"
    )
    unite_semee = models.CharField(max_length=20, blank=True)

    METHODE_CHOICES = [
        ('interieur', 'À l\'intérieur'),
        ('exterieur', 'Direct en pleine terre'),
        ('serre', 'Sous serre'),
        ('godets', 'Godets/Plateaux'),
        ('autre', 'Autre'),
    ]
    methode = models.CharField(
        max_length=20,
        choices=METHODE_CHOICES,
        blank=True
    )

    # Résultats observés
    taux_germination_reel = models.FloatField(
        null=True,
        blank=True,
        help_text="Taux de germination observé (%)"
    )
    date_premiere_germination = models.DateField(null=True, blank=True)
    nb_plants_obtenus = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Mes semis"
        verbose_name_plural = "Mes semis"
        ordering = ['-date_semis']

    def __str__(self):
        return f"Semis {self.seed_collection.organisme.nom_commun} — {self.date_semis}"


class Amendment(models.Model):
    """
    Engrais, compost, amendements du sol.
    Ex: Compost, fumier, chaux, soufre, paillis, engrais verts
    """
    
    nom = models.CharField(
        max_length=200,
        help_text="Ex: Compost maison, Fumier de poule, Chaux dolomitique"
    )
    
    TYPE_CHOICES = [
        ('compost', 'Compost'),
        ('fumier', 'Fumier'),
        ('engrais_vert', 'Engrais vert (plantes)'),
        ('mineraux', 'Amendement minéral'),
        ('organique_commercial', 'Engrais organique commercial'),
        ('chimique', 'Engrais chimique'),
        ('paillis', 'Paillis/Mulch'),
        ('brf', 'BRF (Bois Raméal Fragmenté)'),
        ('autre', 'Autre'),
    ]
    type_amendment = models.CharField(
        max_length=25,
        choices=TYPE_CHOICES
    )
    
    # Composition NPK (Azote, Phosphore, Potassium)
    azote_n = models.FloatField(
        null=True,
        blank=True,
        help_text="% Azote (N)"
    )
    phosphore_p = models.FloatField(
        null=True,
        blank=True,
        help_text="% Phosphore (P)"
    )
    potassium_k = models.FloatField(
        null=True,
        blank=True,
        help_text="% Potassium (K)"
    )
    
    # Effet sur le pH
    EFFET_PH_CHOICES = [
        ('acidifie', 'Acidifie le sol'),
        ('neutre', 'Neutre'),
        ('alcalinise', 'Alcalinise/Chaux le sol'),
    ]
    effet_ph = models.CharField(
        max_length=15,
        choices=EFFET_PH_CHOICES,
        blank=True
    )
    
    # Pour quels types de sols?
    bon_pour_sols = models.JSONField(
        default=list,
        blank=True,
        help_text="Types de sols bénéficiaires (argileux, sablonneux, etc.)"
    )
    
    # Pour quels types d'organismes?
    bon_pour_types = models.JSONField(
        default=list,
        blank=True,
        help_text="Types d'organismes bénéficiaires (arbres fruitiers, légumes, etc.)"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Description, mode d'emploi, précautions"
    )
    
    dose_recommandee = models.CharField(
        max_length=200,
        blank=True,
        help_text="Ex: 5-10 kg/m², 2 cm d'épaisseur"
    )
    
    periode_application = models.CharField(
        max_length=200,
        blank=True,
        help_text="Ex: Printemps, Automne, Toute l'année"
    )
    
    biologique = models.BooleanField(
        default=True,
        help_text="Accepté en agriculture biologique?"
    )
    
    date_ajout = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Amendement"
        verbose_name_plural = "Amendements"
        ordering = ['nom']
    
    def __str__(self):
        npk = ""
        if self.azote_n or self.phosphore_p or self.potassium_k:
            npk = f" ({self.azote_n or 0}-{self.phosphore_p or 0}-{self.potassium_k or 0})"
        return f"{self.nom}{npk}"


class OrganismAmendment(models.Model):
    """
    Recommandation : quel amendement pour quel organisme.
    Permet de faire des recommandations ciblées par espèce (pas seulement par type).
    """
    organisme = models.ForeignKey(
        'species.Organism',
        on_delete=models.CASCADE,
        related_name='amendements_recommandes'
    )
    amendment = models.ForeignKey(
        'species.Amendment',
        on_delete=models.CASCADE,
        related_name='organismes_recommandes'
    )

    PRIORITE_CHOICES = [
        (1, 'Recommandé'),
        (2, 'Utile'),
        (3, 'Optionnel'),
        (4, 'À éviter'),
    ]
    priorite = models.IntegerField(
        choices=PRIORITE_CHOICES,
        default=1,
        help_text="Niveau de recommandation"
    )

    dose_specifique = models.CharField(
        max_length=200,
        blank=True,
        help_text="Dose ou fréquence spécifique pour cet organisme"
    )

    moment_application = models.CharField(
        max_length=200,
        blank=True,
        help_text="Ex: À la plantation, Printemps, Après fructification"
    )

    notes = models.TextField(
        blank=True,
        help_text="Notes spécifiques à cette combinaison organisme/amendement"
    )

    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Recommandation Organisme-Amendement"
        verbose_name_plural = "Recommandations Organisme-Amendement"
        unique_together = ['organisme', 'amendment']
        ordering = ['organisme__nom_commun', 'priorite']

    def __str__(self):
        return f"{self.organisme.nom_commun} ← {self.amendment.nom} ({self.get_priorite_display()})"


class Garden(models.Model):
    """
    Jardin avec adresse pour le suivi météo et l'automatisation.
    Chaque jardin a une localisation (adresse ou coordonnées) utilisée pour
    récupérer les données météo et générer des alertes d'arrosage.
    """
    nom = models.CharField(
        max_length=200,
        help_text="Nom du jardin (ex: Mont Caprice, Potager urbain)"
    )

    # === ADRESSE ===
    adresse = models.CharField(
        max_length=400,
        blank=True,
        help_text="Adresse complète (rue, ville, code postal, pays)"
    )
    ville = models.CharField(max_length=100, blank=True)
    code_postal = models.CharField(max_length=20, blank=True)
    pays = models.CharField(max_length=100, default="Canada")

    # === COORDONNÉES (pour API météo) ===
    latitude = models.FloatField(
        null=True,
        blank=True,
        help_text="Latitude pour la météo (Open-Meteo)"
    )
    longitude = models.FloatField(
        null=True,
        blank=True,
        help_text="Longitude pour la météo"
    )
    timezone = models.CharField(
        max_length=50,
        default="America/Montreal",
        help_text="Fuseau horaire (ex: America/Montreal)"
    )

    # === SEUILS ALERTE ARROSAGE ===
    seuil_temp_chaud_c = models.FloatField(
        default=25.0,
        help_text="Température moyenne quotidienne au-dessus de laquelle on considère 'chaud' (°C)"
    )
    seuil_pluie_faible_mm = models.FloatField(
        default=5.0,
        help_text="Pluie totale en-dessous de laquelle on considère 'sec' sur la période (mm)"
    )
    jours_periode_analyse = models.IntegerField(
        default=5,
        help_text="Nombre de jours consécutifs à analyser pour l'alerte sécheresse"
    )
    jours_sans_pluie_prevision = models.IntegerField(
        default=3,
        help_text="Nombre de jours sans pluie prévus pour alerter (planifier arrosage avant vacances)"
    )
    seuil_gel_c = models.FloatField(
        default=-2.0,
        help_text="Température min en dessous de laquelle alerter (gel risque pour fruitiers)"
    )
    seuil_temp_elevee_c = models.FloatField(
        default=32.0,
        null=True,
        blank=True,
        help_text="Température max au-dessus de laquelle alerter (canicule). Configurable dans admin."
    )
    seuil_pluie_forte_mm = models.FloatField(
        default=15.0,
        help_text="Précipitations au-dessus desquelles annuler l'arrosage automatique (mm/jour)"
    )

    # Zone de rusticité du jardin (pour alerte espèce/jardin en hiver)
    zone_rusticite = models.CharField(
        max_length=10,
        blank=True,
        help_text="Zone USDA du jardin (ex: 4a) pour alertes protection hivernale"
    )

    notes = models.TextField(blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Jardin"
        verbose_name_plural = "Jardins"
        ordering = ['nom']

    def __str__(self):
        return self.nom

    def a_coordonnees(self):
        """Vérifie si le jardin a des coordonnées pour la météo."""
        return self.latitude is not None and self.longitude is not None

    def pluie_semaine_mm(self):
        """Précipitations totales des 7 derniers jours (mm)."""
        from datetime import date, timedelta
        start = date.today() - timedelta(days=7)
        from django.db.models import Sum
        result = self.weather_records.filter(
            date__gte=start,
            date__lte=date.today(),
        ).aggregate(total=Sum('precipitation_mm'))
        total = result.get('total')
        return round(total, 1) if total is not None else None


class Specimen(models.Model):
    """
    Un plant/arbre individuel sur le terrain.
    Ex: "Mon Pommier Dolgo #1 près du ruisseau"
    """
    
    # Lien vers le jardin (optionnel)
    garden = models.ForeignKey(
        'species.Garden',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens',
        help_text="Jardin où se trouve ce spécimen"
    )

    # Lien vers l'espèce/organisme
    organisme = models.ForeignKey(
        'species.Organism',
        on_delete=models.PROTECT,  # Empêche de supprimer l'organisme si des specimens existent
        related_name='specimens'
    )
    
    # === IDENTIFICATION ===
    nom = models.CharField(
        max_length=200,
        help_text="Nom personnel du specimen (ex: Pommier Dolgo #1, Basilic du balcon)"
    )
    
    code_identification = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        help_text="Code unique (ex: PMMDOL-001, code manuel)"
    )

    nfc_tag_uid = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        help_text="UID du tag NFC/RFID (ex: 04A1B2C3D4E5F6). Scan → ouvre la fiche."
    )

    # === LOCALISATION ===
    zone_jardin = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ex: Zone Nord, Près du ruisseau, Forêt Est"
    )
    
    latitude = models.FloatField(
        null=True,
        blank=True,
        help_text="Coordonnée GPS"
    )
    
    longitude = models.FloatField(
        null=True,
        blank=True,
        help_text="Coordonnée GPS"
    )
    
    # === PLANTATION ===
    date_plantation = models.DateField(
        null=True,
        blank=True,
        help_text="Date de plantation sur le terrain"
    )
    
    age_plantation = models.IntegerField(
        null=True,
        blank=True,
        help_text="Âge du plant à la plantation (années)"
    )
    
    SOURCE_CHOICES = [
        ('pepiniere', 'Acheté en pépinière'),
        ('semis', 'Semis maison'),
        ('bouture', 'Bouturage'),
        ('division', 'Division'),
        ('greffe', 'Greffé'),
        ('marcottage', 'Marcottage'),
        ('echange', 'Échange/Don'),
        ('sauvage', 'Prélevé en nature'),
        ('autre', 'Autre'),
    ]
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        blank=True
    )
    
    pepiniere_fournisseur = models.CharField(
        max_length=200,
        blank=True,
        help_text="Nom de la pépinière ou fournisseur"
    )

    # Lien vers la collection de semences quand source='semis'
    seed_collection = models.ForeignKey(
        'species.SeedCollection',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens_issus',
        help_text="Lot de semences utilisé (quand source = Semis maison)"
    )
    
    # === ÉTAT ACTUEL ===
    STATUT_CHOICES = [
        ('planifie', '📋 Planifié'),
        ('commande', '🛒 Commandé'),
        ('transplanter', '🌱 À transplanter'),
        ('jeune', '🌿 Jeune plant'),
        ('etabli', '🌳 Établi'),
        ('mature', '🎯 Mature/Production'),
        ('declin', '📉 En déclin'),
        ('mort', '💀 Mort'),
        ('enleve', '🗑️ Enlevé'),
    ]
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='planifie'
    )
    
    sante = models.IntegerField(
        default=5,
        help_text="État de santé général (1=très malade, 10=excellent)"
    )
    
    hauteur_actuelle = models.FloatField(
        null=True,
        blank=True,
        help_text="Hauteur actuelle en mètres"
    )
    
    # === PRODUCTION (pour fruitiers) ===
    premiere_fructification = models.IntegerField(
        null=True,
        blank=True,
        help_text="Année de première fructification"
    )
    
    # === NOTES ===
    notes = models.TextField(
        blank=True,
        help_text="Observations, particularités, historique"
    )

    # Photo affichée par défaut (ex: sur la page d'accueil, listes)
    photo_principale = models.ForeignKey(
        'species.Photo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens_photo_principale',
        help_text="Photo affichée par défaut pour ce spécimen"
    )
    
    # === MÉTADONNÉES ===
    date_ajout = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Spécimen"
        verbose_name_plural = "Spécimens"
        ordering = ['-date_plantation', 'nom']
    
    def __str__(self):
        return f"{self.nom} ({self.organisme.nom_commun})"
    
    def age_annees(self):
        """Calcule l'âge approximatif du specimen"""
        if self.date_plantation:
            from datetime import date
            delta = date.today() - self.date_plantation
            annees = delta.days // 365
            if self.age_plantation:
                return annees + self.age_plantation
            return annees
        return self.age_plantation
    
    age_annees.short_description = "Âge (années)"


class SpecimenFavorite(models.Model):
    """Favoris utilisateur pour les spécimens."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='specimen_favorites',
    )
    specimen = models.ForeignKey(
        'species.Specimen',
        on_delete=models.CASCADE,
        related_name='favorited_by',
    )

    class Meta:
        unique_together = [['user', 'specimen']]
        verbose_name = "Spécimen favori"
        verbose_name_plural = "Spécimens favoris"


class OrganismFavorite(models.Model):
    """Favoris utilisateur pour les espèces (organismes)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organism_favorites',
    )
    organism = models.ForeignKey(
        'species.Organism',
        on_delete=models.CASCADE,
        related_name='favorited_by',
    )

    class Meta:
        unique_together = [['user', 'organism']]
        verbose_name = "Espèce favorie"
        verbose_name_plural = "Espèces favorites"


class Event(models.Model):
    """
    Événement dans la vie d'un spécimen.
    Ex: Plantation, Arrosage, Taille, Observation, Récolte
    """
    
    specimen = models.ForeignKey(
        'species.Specimen',
        on_delete=models.CASCADE,
        related_name='evenements'
    )
    
    # === TYPE D'ÉVÉNEMENT ===
    TYPE_CHOICES = [
        ('plantation', '🌱 Plantation'),
        ('arrosage', '💧 Arrosage'),
        ('fertilisation', '🌿 Fertilisation'),
        ('amendement', '🪨 Amendement sol'),
        ('taille', '✂️ Taille/Élagage'),
        ('paillage', '🍂 Paillage'),
        ('observation', '👁️ Observation'),
        ('floraison', '🌸 Floraison'),
        ('fructification', '🍎 Fructification'),
        ('recolte', '🧺 Récolte'),
        ('maladie', '🦠 Maladie/Problème'),
        ('traitement', '💊 Traitement'),
        ('transplantation', '🚚 Transplantation'),
        ('protection', '🛡️ Protection (hiver, animaux)'),
        ('autre', '📝 Autre'),
        ('mort', '💀 Mort'),
        ('enlever', '🗑️ Enlevé'),
    ]
    type_event = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES
    )
    
    # === DATE & TEMPS ===
    date = models.DateField(
        help_text="Date de l'événement"
    )
    
    heure = models.TimeField(
        null=True,
        blank=True,
        help_text="Heure (optionnel)"
    )
    
    # === DÉTAILS ===
    titre = models.CharField(
        max_length=200,
        blank=True,
        help_text="Titre court (optionnel, sinon type suffit)"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Description détaillée, observations"
    )
    
    # === QUANTITÉS (selon type) ===
    quantite = models.FloatField(
        null=True,
        blank=True,
        help_text="Quantité (litres d'eau, kg récoltés, etc.)"
    )
    
    unite = models.CharField(
        max_length=50,
        blank=True,
        help_text="Unité (L, kg, heures, cm, etc.)"
    )
    
    # === AMENDEMENT/PRODUIT UTILISÉ ===
    amendment = models.ForeignKey(
        'species.Amendment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Amendement utilisé (si applicable)"
    )
    
    produit_utilise = models.CharField(
        max_length=200,
        blank=True,
        help_text="Autre produit/outil utilisé"
    )
    
    # === CONDITIONS ===
    temperature = models.FloatField(
        null=True,
        blank=True,
        help_text="Température en °C"
    )
    
    conditions_meteo = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ex: Ensoleillé, Pluvieux, Nuageux"
    )
    
    # === MÉTADONNÉES ===
    date_ajout = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Événement"
        verbose_name_plural = "Événements"
        ordering = ['-date', '-heure']
    
    def __str__(self):
        emoji = dict(self.TYPE_CHOICES).get(self.type_event, '📝')
        if self.titre:
            return f"{emoji} {self.specimen.nom} - {self.titre} ({self.date})"
        return f"{emoji} {self.specimen.nom} - {self.get_type_event_display()} ({self.date})"


class Reminder(models.Model):
    """
    Rappel lié à un spécimen.
    Créé depuis la création d'événement (option supplémentaire).
    """
    specimen = models.ForeignKey(
        'species.Specimen',
        on_delete=models.CASCADE,
        related_name='rappels',
    )

    TYPE_RAPPEL_CHOICES = [
        ('arrosage', '💧 Arrosage'),
        ('suivi_maladie', '🦠 Suivi de maladie'),
        ('taille', '✂️ Taille'),
        ('suivi_general', '👁️ Suivi général'),
        ('cueillette', '🧺 Cueillette'),
    ]
    type_rappel = models.CharField(
        max_length=20,
        choices=TYPE_RAPPEL_CHOICES,
    )

    date_rappel = models.DateField(
        help_text="Date du rappel",
    )

    TYPE_ALERTE_CHOICES = [
        ('email', 'Email'),
        ('popup', 'Popup'),
        ('son', 'Son'),
    ]
    type_alerte = models.CharField(
        max_length=10,
        choices=TYPE_ALERTE_CHOICES,
        default='popup',
    )

    titre = models.CharField(
        max_length=200,
        blank=True,
        help_text="Titre court (optionnel)",
    )
    description = models.TextField(
        blank=True,
        help_text="Description (optionnel)",
    )

    RECURRENCE_CHOICES = [
        ('none', 'Aucune'),
        ('biweekly', 'Toutes les 2 semaines'),
        ('annual', 'Annuel'),
        ('biannual', 'Bi-annuel (2×/an)'),
    ]
    recurrence_rule = models.CharField(
        max_length=20,
        choices=RECURRENCE_CHOICES,
        default='none',
        blank=True,
        help_text="Répétition du rappel après complétion",
    )

    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Rappel"
        verbose_name_plural = "Rappels"
        ordering = ['date_rappel', 'date_ajout']

    def __str__(self):
        emoji = dict(self.TYPE_RAPPEL_CHOICES).get(self.type_rappel, '⏰')
        label = self.titre or self.get_type_rappel_display()
        return f"{emoji} {self.specimen.nom} - {label} ({self.date_rappel})"


class UserPreference(models.Model):
    """Préférences utilisateur (jardin par défaut pour saisons, etc.)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='species_preference',
    )
    default_garden = models.ForeignKey(
        'species.Garden',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        help_text="Jardin par défaut (saisons, repères)",
    )

    class Meta:
        verbose_name = "Préférence utilisateur"
        verbose_name_plural = "Préférences utilisateur"


class Photo(models.Model):
    """
    Photo d'un organisme ou d'un spécimen.
    type_photo permet de catégoriser pour identification, diagnostic santé et documentation.
    """
    
    # Types de photo (galerie éducative: identification, diagnostic, documentation saisonnière)
    TYPE_PHOTO_CHOICES = [
        ('tronc_juvenile', 'Tronc - juvénile'),
        ('tronc_mature', 'Tronc - mature'),
        ('tronc_malade', 'Tronc - malade'),
        ('tronc_ecorce', 'Tronc - écorce détail'),
        ('feuillage_printemps', 'Feuillage - printemps'),
        ('feuillage_ete', 'Feuillage - été'),
        ('feuillage_automne', 'Feuillage - automne'),
        ('feuillage_jeune', 'Feuillage - jeune'),
        ('feuillage_sain', 'Feuillage - sain'),
        ('feuillage_malade', 'Feuillage - malade'),
        ('branches_juvenile', 'Branches - juvénile'),
        ('branches_mature', 'Branches - mature'),
        ('branches_bourgeons', 'Branches - bourgeons'),
        ('reproduction_fleurs', 'Reproduction - fleurs'),
        ('reproduction_fruits_immature', 'Reproduction - fruits immature'),
        ('reproduction_fruits_mur', 'Reproduction - fruits mûr'),
        ('reproduction_graines', 'Reproduction - graines'),
        ('racines', 'Racines (système racinaire)'),
        ('port_general', 'Port général et silhouette hiver'),
        ('problemes', 'Problèmes courants (maladies, parasites)'),
        ('avant', 'Avant (ex: avant taille)'),
        ('apres', 'Après (ex: après taille)'),
        ('autre', 'Autre'),
    ]
    
    # Peut être lié soit à un organisme (photo générique) soit à un specimen (photo spécifique)
    organisme = models.ForeignKey(
        'species.Organism',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='photos',
        help_text="Photo générique de l'espèce"
    )
    
    specimen = models.ForeignKey(
        'species.Specimen',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='photos',
        help_text="Photo de ce specimen spécifique"
    )
    
    event = models.ForeignKey(
        'species.Event',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='photos',
        help_text="Photo liée à un événement"
    )
    
    # === IMAGE ===
    image = models.ImageField(
        upload_to='photos/%Y/%m/',
        help_text="Photo (JPG, PNG)"
    )
    
    # === TYPE (galerie éducative) ===
    type_photo = models.CharField(
        max_length=35,
        choices=TYPE_PHOTO_CHOICES,
        blank=True,
        help_text="Type de vue pour identification et diagnostic (tronc, feuillage, reproduction, etc.)"
    )
    
    # === MÉTADONNÉES ===
    titre = models.CharField(
        max_length=200,
        blank=True
    )
    
    description = models.TextField(
        blank=True,
        help_text="Description, observations"
    )
    
    date_prise = models.DateField(
        null=True,
        blank=True,
        help_text="Date de prise de la photo"
    )
    
    # === ATTRIBUTION (Wikimedia, etc.) ===
    source_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="URL de la page source (Wikimedia Commons, Wikidata)"
    )
    source_author = models.CharField(
        max_length=200,
        blank=True,
        help_text="Auteur et licence (ex: John Doe, CC BY-SA 4.0)"
    )
    source_license = models.CharField(
        max_length=50,
        blank=True,
        help_text="Code licence (ex: CC-BY-SA-4.0)"
    )
    
    # === AUTO ===
    date_ajout = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Photo"
        verbose_name_plural = "Photos"
        ordering = ['-date_prise', '-date_ajout']


class WeatherRecord(models.Model):
    """
    Enregistrement météo quotidien par jardin.
    Cache les données Open-Meteo pour éviter les appels API répétés.
    """
    garden = models.ForeignKey(
        'species.Garden',
        on_delete=models.CASCADE,
        related_name='weather_records'
    )
    date = models.DateField(db_index=True)

    # Températures °C
    temp_max = models.FloatField(null=True, blank=True)
    temp_min = models.FloatField(null=True, blank=True)
    temp_mean = models.FloatField(null=True, blank=True)

    # Précipitations mm (pluie + neige équivalente)
    precipitation_mm = models.FloatField(default=0.0, help_text="Précipitations totales (mm)")
    rain_mm = models.FloatField(null=True, blank=True, help_text="Pluie uniquement (mm)")
    snowfall_cm = models.FloatField(null=True, blank=True, help_text="Neige (cm)")

    # Évapotranspiration FAO (utile pour irrigation)
    et0_mm = models.FloatField(null=True, blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Météo"
        verbose_name_plural = "Météo"
        unique_together = ['garden', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.garden.nom} — {self.date}"


class SprinklerZone(models.Model):
    """
    Zone d'arrosage / sprinkler pour automatisaton domotique.
    Permet de déclencher un arrosage via webhook, MQTT, Home Assistant, etc.
    """
    garden = models.ForeignKey(
        'species.Garden',
        on_delete=models.CASCADE,
        related_name='sprinkler_zones'
    )
    nom = models.CharField(
        max_length=100,
        help_text="Ex: Zone potager, Sprinkler Nord, Arrosage serre"
    )

    # Intégration domotique (flexible)
    TYPE_INTEGRATION_CHOICES = [
        ('webhook', 'Webhook (URL)'),
        ('mqtt', 'MQTT'),
        ('home_assistant', 'Home Assistant'),
        ('ifttt', 'IFTTT'),
        ('autre', 'Autre'),
    ]
    type_integration = models.CharField(
        max_length=30,
        choices=TYPE_INTEGRATION_CHOICES,
        default='webhook'
    )

    # URL webhook ou config (JSON)
    webhook_url = models.URLField(
        blank=True,
        help_text="URL à appeler pour déclencher l'arrosage (POST)"
    )
    config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Config supplémentaire (topic MQTT, entity_id HA, etc.)"
    )
    actif = models.BooleanField(default=True)
    annuler_si_pluie_prevue = models.BooleanField(
        default=True,
        help_text="Ne pas déclencher si forte pluie prévue dans les 24-48h"
    )

    duree_defaut_minutes = models.IntegerField(
        default=15,
        help_text="Durée d'arrosage par défaut (minutes)"
    )
    notes = models.TextField(blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sprinkler system"
        verbose_name_plural = "Sprinklers system"
        ordering = ['garden', 'nom']

    def __str__(self):
        return f"{self.garden.nom} — {self.nom}"