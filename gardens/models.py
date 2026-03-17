"""
Jardins, météo, arrosage, préférences utilisateur.
Models moved from species app; tables unchanged (db_table preserved).
Zone.boundary : GeoJSON Polygon (JSONField), surface_m2 calculée avec shapely+pyproj (sans GDAL).
"""
from django.conf import settings
from django.db import models


class Garden(models.Model):
    """
    Jardin avec adresse pour le suivi météo et l'automatisation.
    """
    nom = models.CharField(max_length=200, help_text="Nom du jardin (ex: Mont Caprice, Potager urbain)")
    adresse = models.CharField(max_length=400, blank=True, help_text="Adresse complète (rue, ville, code postal, pays)")
    ville = models.CharField(max_length=100, blank=True)
    code_postal = models.CharField(max_length=20, blank=True)
    pays = models.CharField(max_length=100, default="Canada")
    latitude = models.FloatField(null=True, blank=True, help_text="Latitude pour la météo (Open-Meteo)")
    longitude = models.FloatField(null=True, blank=True, help_text="Longitude pour la météo")
    timezone = models.CharField(max_length=50, default="America/Montreal", help_text="Fuseau horaire (ex: America/Montreal)")
    seuil_temp_chaud_c = models.FloatField(default=25.0, help_text="Température moyenne quotidienne au-dessus de laquelle on considère 'chaud' (°C)")
    seuil_pluie_faible_mm = models.FloatField(default=5.0, help_text="Pluie totale en-dessous de laquelle on considère 'sec' sur la période (mm)")
    jours_periode_analyse = models.IntegerField(default=5, help_text="Nombre de jours consécutifs à analyser pour l'alerte sécheresse")
    jours_sans_pluie_prevision = models.IntegerField(default=3, help_text="Nombre de jours sans pluie prévus pour alerter")
    seuil_gel_c = models.FloatField(default=-2.0, help_text="Température min en dessous de laquelle alerter (gel risque pour fruitiers)")
    seuil_temp_elevee_c = models.FloatField(default=32.0, null=True, blank=True, help_text="Température max au-dessus de laquelle alerter (canicule)")
    seuil_pluie_forte_mm = models.FloatField(default=15.0, help_text="Précipitations au-dessus desquelles annuler l'arrosage automatique (mm/jour)")
    zone_rusticite = models.CharField(max_length=10, blank=True, help_text="Zone USDA du jardin (ex: 4a)")
    notes = models.TextField(blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    # Vue terrain 3D (Cesium)
    boundary = models.JSONField(
        null=True,
        blank=True,
        help_text="Limites géographiques de la propriété en GeoJSON Polygon",
    )
    contours_geojson = models.JSONField(
        null=True,
        blank=True,
        help_text="Courbes de niveau en GeoJSON FeatureCollection (polylines)",
    )
    terrain_stats = models.JSONField(
        null=True,
        blank=True,
        help_text="altitude_min, altitude_max, pente_moyenne, surface_ha, nb_cours_eau",
    )
    surface_ha = models.FloatField(
        null=True,
        blank=True,
        help_text="Surface en hectares (optionnel)",
    )
    distance_unit = models.CharField(
        max_length=2,
        choices=[('m', 'Mètres'), ('ft', 'Pieds')],
        default='m',
        help_text="Unité de mesure par défaut pour ce jardin (la vue peut basculer temporairement).",
    )

    class Meta:
        db_table = 'species_garden'
        verbose_name = "Jardin"
        verbose_name_plural = "Jardins"
        ordering = ['nom']

    def __str__(self):
        return self.nom

    def a_coordonnees(self):
        return self.latitude is not None and self.longitude is not None

    def pluie_semaine_mm(self):
        from datetime import date, timedelta
        start = date.today() - timedelta(days=7)
        from django.db.models import Sum
        result = self.weather_records.filter(
            date__gte=start,
            date__lte=date.today(),
        ).aggregate(total=Sum('precipitation_mm'))
        total = result.get('total')
        return round(total, 1) if total is not None else None


class GardenGCP(models.Model):
    """
    Point de contrôle au sol (GCP) pour calibration des images drone (OpenDroneMap).
    """
    garden = models.ForeignKey(
        Garden,
        on_delete=models.CASCADE,
        related_name='gcps',
    )
    label = models.CharField(max_length=50, help_text="Ex: GCP-01, GCP-02")
    latitude = models.FloatField()
    longitude = models.FloatField()
    photo = models.ImageField(upload_to='garden_gcps/', blank=True, null=True)
    date_capture = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'gardens_gardengcp'
        verbose_name = "Point de contrôle (GCP)"
        verbose_name_plural = "Points de contrôle (GCP)"
        ordering = ['label']

    def __str__(self):
        return f"{self.garden.nom} — {self.label}"


class WeatherRecord(models.Model):
    """Enregistrement météo quotidien par jardin."""
    garden = models.ForeignKey('gardens.Garden', on_delete=models.CASCADE, related_name='weather_records')
    date = models.DateField(db_index=True)
    temp_max = models.FloatField(null=True, blank=True)
    temp_min = models.FloatField(null=True, blank=True)
    temp_mean = models.FloatField(null=True, blank=True)
    precipitation_mm = models.FloatField(default=0.0, help_text="Précipitations totales (mm)")
    rain_mm = models.FloatField(null=True, blank=True)
    snowfall_cm = models.FloatField(null=True, blank=True)
    et0_mm = models.FloatField(null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'species_weatherrecord'
        verbose_name = "Météo"
        verbose_name_plural = "Météo"
        unique_together = ['garden', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.garden.nom} — {self.date}"


class SprinklerZone(models.Model):
    """Zone d'arrosage / sprinkler pour automatisaton domotique."""
    garden = models.ForeignKey('gardens.Garden', on_delete=models.CASCADE, related_name='sprinkler_zones')
    nom = models.CharField(max_length=100, help_text="Ex: Zone potager, Sprinkler Nord")
    TYPE_INTEGRATION_CHOICES = [
        ('webhook', 'Webhook (URL)'),
        ('mqtt', 'MQTT'),
        ('home_assistant', 'Home Assistant'),
        ('ifttt', 'IFTTT'),
        ('autre', 'Autre'),
    ]
    type_integration = models.CharField(max_length=30, choices=TYPE_INTEGRATION_CHOICES, default='webhook')
    webhook_url = models.URLField(blank=True, help_text="URL à appeler pour déclencher l'arrosage (POST)")
    config = models.JSONField(default=dict, blank=True, help_text="Config supplémentaire (topic MQTT, entity_id HA, etc.)")
    actif = models.BooleanField(default=True)
    annuler_si_pluie_prevue = models.BooleanField(default=True, help_text="Ne pas déclencher si forte pluie prévue dans les 24-48h")
    duree_defaut_minutes = models.IntegerField(default=15, help_text="Durée d'arrosage par défaut (minutes)")
    notes = models.TextField(blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'species_sprinklerzone'
        verbose_name = "Sprinkler system"
        verbose_name_plural = "Sprinklers system"
        ordering = ['garden', 'nom']

    def __str__(self):
        return f"{self.garden.nom} — {self.nom}"


class UserPreference(models.Model):
    """Préférences utilisateur (jardin par défaut pour saisons, etc.)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='species_preference',
    )
    default_garden = models.ForeignKey(
        'gardens.Garden',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
        help_text="Jardin par défaut (saisons, repères)",
    )
    pollination_distance_max_default_m = models.FloatField(
        null=True,
        blank=True,
        help_text="Distance de pollinisation par défaut (m) pour les plants.",
    )

    class Meta:
        db_table = 'species_userpreference'
        verbose_name = "Préférence utilisateur"
        verbose_name_plural = "Préférences utilisateur"


class Zone(models.Model):
    """
    Zone au sein d'un jardin (polygone GeoJSON, type, surface calculée en m²).
    boundary : GeoJSON Polygon (WGS84). surface_m2 calculée via projection Québec (EPSG:32198)
    avec shapely + pyproj (pas de GDAL requis).
    """
    TYPE_ZONE_CHOICES = [
        ('stationnement', 'Stationnement'),
        ('culture', 'Culture'),
        ('boise', 'Boisé'),
        ('eau', 'Eau'),
        ('batiment', 'Bâtiment'),
        ('autre', 'Autre'),
    ]

    garden = models.ForeignKey(
        Garden,
        on_delete=models.CASCADE,
        related_name='zones',
    )
    nom = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPE_ZONE_CHOICES, default='autre')
    boundary = models.JSONField(
        null=True,
        blank=True,
        help_text="Polygone GeoJSON (type Polygon, WGS84). Ex: {\"type\":\"Polygon\",\"coordinates\":[[[lng,lat],...]]}",
    )
    surface_m2 = models.FloatField(null=True, blank=True, help_text="Surface en m² (calculée depuis boundary)")
    batiment_hauteur_m = models.FloatField(
        null=True,
        blank=True,
        help_text="Hauteur en m (pour type Bâtiment uniquement)",
    )
    couleur = models.CharField(max_length=20, default='#3d5c2e')
    ordre = models.IntegerField(default=0)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gardens_zone'
        verbose_name = "Zone"
        verbose_name_plural = "Zones"
        ordering = ['ordre', 'nom']

    def __str__(self):
        return f"{self.garden.nom} — {self.nom}"

    def save(self, *args, **kwargs):
        if self.boundary and isinstance(self.boundary, dict):
            try:
                from shapely.geometry import shape
                from shapely.ops import transform as shapely_transform
                from pyproj import Transformer
                geom = shape(self.boundary)
                if geom.is_empty or geom.geom_type != 'Polygon':
                    self.surface_m2 = None
                else:
                    transformer = Transformer.from_crs("EPSG:4326", "EPSG:32198", always_xy=True)
                    projected = shapely_transform(transformer.transform, geom)
                    self.surface_m2 = projected.area
            except Exception:
                self.surface_m2 = None
        else:
            self.surface_m2 = None
        super().save(*args, **kwargs)


class Partner(models.Model):
    """
    Partenaire / fournisseur / catalogue préféré (liens vers sites externes).
    Éditable en admin ; évolution possible vers sponsorship.
    """
    nom = models.CharField(max_length=200, help_text="Nom du partenaire ou fournisseur")
    url = models.URLField(help_text="Lien vers le site")
    ordre = models.IntegerField(default=0, help_text="Ordre d'affichage (plus petit = en premier)")
    actif = models.BooleanField(default=True)
    notes = models.TextField(blank=True, help_text="Notes internes (optionnel)")

    class Meta:
        db_table = 'gardens_partner'
        verbose_name = "Partenaire / Fournisseur"
        verbose_name_plural = "Partenaires / Fournisseurs"
        ordering = ['ordre', 'nom']

    def __str__(self):
        return self.nom
