from django.conf import settings
from django.db import models

# Catalog models (moved to catalog app; re-exported for backwards compatibility)
from catalog.models import (
    _slugify_latin,
    Organism,
    OrganismNom,
    OrganismPropriete,
    OrganismUsage,
    OrganismCalendrier,
    UserTag,
    OrganismUserTag,
    CompanionRelation,
    Cultivar,
    CultivarPorteGreffe,
    CultivarPollinator,
    SeedSupplier,
    SeedCollection,
    SemisBatch,
    Amendment,
    OrganismAmendment,
    BaseEnrichmentStats,
)
from gardens.models import Garden, WeatherRecord, SprinklerZone, UserPreference


# (Catalog and gardens models moved to catalog/gardens apps; re-exported above.)


class Specimen(models.Model):
    """
    Un plant/arbre individuel sur le terrain.
    Ex: "Mon Pommier Dolgo #1 près du ruisseau"
    """
    
    # Lien vers le jardin (optionnel)
    garden = models.ForeignKey(
        'gardens.Garden',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens',
        help_text="Jardin où se trouve ce spécimen"
    )

    # Lien vers l'espèce et optionnellement le cultivar
    organisme = models.ForeignKey(
        'catalog.Organism',
        on_delete=models.PROTECT,
        related_name='specimens',
        help_text="Espèce (ex: Malus pumila)",
    )
    cultivar = models.ForeignKey(
        'catalog.Cultivar',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens',
        help_text="Variété/cultivar si connu (ex: Dolgo)",
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
    zone = models.ForeignKey(
        'gardens.Zone',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens',
        help_text="Zone du jardin (modèle Zone) si définie",
    )
    zone_jardin = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ex: Zone Nord, Près du ruisseau, Forêt Est (libellé libre, conservé pour compatibilité)"
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
        'catalog.SeedCollection',
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
        'catalog.Organism',
        on_delete=models.CASCADE,
        related_name='favorited_by',
    )

    class Meta:
        unique_together = [['user', 'organism']]
        verbose_name = "Espèce favorie"
        verbose_name_plural = "Espèces favorites"


class SpecimenGroup(models.Model):
    """
    Groupe de spécimens liés pour la pollinisation :
    - male_female : un pollinisateur (mâle) + jusqu'à 6 principaux (femelles)
    - cross_pollination_cultivar : au moins 2 cultivars (partenaires) pour pollinisation croisée
    """
    TYPE_GROUPE_CHOICES = [
        ('male_female', 'Mâle / femelle'),
        ('cross_pollination_cultivar', 'Pollinisation croisée (cultivars)'),
    ]
    type_groupe = models.CharField(
        max_length=30,
        choices=TYPE_GROUPE_CHOICES,
    )
    organisme = models.ForeignKey(
        'catalog.Organism',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        help_text="Espèce commune (optionnel, pour cross_pollination_cultivar)",
    )
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Groupe de pollinisation"
        verbose_name_plural = "Groupes de pollinisation"
        ordering = ['-date_ajout']

    def __str__(self):
        return f"Groupe {self.get_type_groupe_display()} ({self.members.count()} membres)"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.pk:
            return
        members = list(self.members.all())
        if self.type_groupe == 'male_female':
            pollinisateurs = [m for m in members if m.role == 'pollinisateur']
            principaux = [m for m in members if m.role == 'principal']
            if len(pollinisateurs) > 1:
                raise ValidationError({"role": "Un seul pollinisateur autorisé par groupe mâle/femelle."})
            if len(principaux) > 6:
                raise ValidationError({"role": "Au plus 6 plants principaux (femelles) par pollinisateur."})
        elif self.type_groupe == 'cross_pollination_cultivar':
            if len(members) < 2:
                raise ValidationError({"members": "Au moins 2 specimens requis pour la pollinisation croisée."})


class SpecimenGroupMember(models.Model):
    """Membre d'un groupe de pollinisation (specimen + rôle)."""
    ROLE_CHOICES = [
        ('pollinisateur', 'Pollinisateur (mâle)'),
        ('principal', 'Principal (femelle)'),
        ('partenaire', 'Partenaire'),
    ]
    group = models.ForeignKey(
        'species.SpecimenGroup',
        on_delete=models.CASCADE,
        related_name='members',
    )
    specimen = models.ForeignKey(
        'species.Specimen',
        on_delete=models.CASCADE,
        related_name='pollination_groups',
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        null=True,
        blank=True,
        help_text="pollinisateur (1 par groupe male_female), principal (jusqu'à 6), partenaire (cross_pollination)",
    )

    class Meta:
        verbose_name = "Membre du groupe"
        verbose_name_plural = "Membres du groupe"
        unique_together = [['group', 'specimen']]
        ordering = ['group', 'role', 'specimen__nom']

    def __str__(self):
        return f"{self.specimen.nom} ({self.get_role_display() or '—'}) dans {self.group}"


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
        'catalog.Amendment',
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
        'catalog.Organism',
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


class DataImportRun(models.Model):
    """
    Historique des exécutions d'import / enrichissement.
    Permet d'afficher le statut et l'historique sur la page Gestion des données et les change_list admin.
    """
    SOURCE_CHOICES = [
        ('pfaf', 'PFAF'),
        ('seeds', 'Semences (CSV/JSON)'),
        ('import_vascan', 'Import VASCAN'),
        ('import_usda', 'Import USDA'),
        ('import_hydroquebec', 'Import Hydro-Québec'),
        ('import_botanipedia', 'Import Botanipedia'),
        ('import_arbres_en_ligne', 'Import Arbres en ligne'),
        ('import_ancestrale', 'Import Pépinière ancestrale'),
        ('import_topic', 'Import TOPIC Canada'),
        ('import_usda_chars', 'Import USDA PLANTS (caractéristiques)'),
        ('import_wikidata', 'Import Wikidata'),
        ('merge_organism_duplicates', 'Merge doublons'),
        ('populate_proprietes_usage_calendrier', 'Populate propriétés/usages/calendrier'),
        ('backup_restore', 'Backup / Restore'),
        ('clean_organisms_keep_hq', 'Clean (garde Hydro-Québec)'),
        ('wipe_species', 'Wipe species'),
        ('wipe_db_and_media', 'Wipe DB and media'),
        ('sync_radixsylva', 'Sync Radix Sylva'),
        ('rebuild_search_vectors', 'Rebuild search vectors'),
    ]
    STATUS_CHOICES = [
        ('running', 'En cours'),
        ('success', 'Succès'),
        ('failure', 'Échec'),
    ]
    TRIGGER_CHOICES = [
        ('admin_import', 'Admin (import)'),
        ('gestion_donnees', 'Gestion des données'),
        ('api', 'API'),
    ]

    source = models.CharField(
        max_length=80,
        choices=SOURCE_CHOICES,
        db_index=True,
        help_text="Type d'import ou commande exécutée",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='running',
        db_index=True,
    )
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    stats = models.JSONField(
        default=dict,
        blank=True,
        help_text="Résumé: created, updated, errors, etc.",
    )
    output_snippet = models.TextField(
        blank=True,
        help_text="Derniers caractères de la sortie (stdout/err) pour débogage",
    )
    trigger = models.CharField(
        max_length=30,
        choices=TRIGGER_CHOICES,
        default='gestion_donnees',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='data_import_runs',
    )

    class Meta:
        verbose_name = "Exécution d'import"
        verbose_name_plural = "Exécutions d'import"
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['source', '-started_at']),
        ]

    def __str__(self):
        return f"{self.get_source_display()} — {self.started_at:%Y-%m-%d %H:%M} ({self.get_status_display()})"