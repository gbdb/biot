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
    
    zone_rusticite = models.CharField(
        max_length=10,
        blank=True,
        help_text="Ex: 4a, 5b (USDA Hardiness Zone)"
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

class Specimen(models.Model):
    """
    Un plant/arbre individuel sur le terrain.
    Ex: "Mon Pommier Dolgo #1 près du ruisseau"
    """
    
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
        unique=True,
        help_text="Code unique (ex: PMMDOL-001, ou tag RFID)"
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
    
class Photo(models.Model):
    """
    Photo d'un organisme ou d'un spécimen.
    """
    
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
    
    # === AUTO ===
    date_ajout = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Photo"
        verbose_name_plural = "Photos"