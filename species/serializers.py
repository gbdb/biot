"""
Serializers pour l'API REST (app mobile Jardin Biot).
"""
from rest_framework import serializers

from .models import Organism, Garden, Specimen, Event, Photo, UserTag


# --- Organism (lecture pour choix espèce) ---
class OrganismMinimalSerializer(serializers.ModelSerializer):
    """Minimal pour listes et choix."""

    class Meta:
        model = Organism
        fields = ['id', 'nom_commun', 'nom_latin', 'type_organisme']


# --- Garden ---
class GardenMinimalSerializer(serializers.ModelSerializer):
    """Pour listes et choix."""

    class Meta:
        model = Garden
        fields = ['id', 'nom', 'ville', 'adresse', 'latitude', 'longitude']


# --- Specimen ---
class SpecimenListSerializer(serializers.ModelSerializer):
    """Liste des spécimens avec organisme et statut."""

    organisme_nom = serializers.CharField(source='organisme.nom_commun', read_only=True)
    organisme_nom_latin = serializers.CharField(source='organisme.nom_latin', read_only=True)
    garden_nom = serializers.CharField(source='garden.nom', read_only=True)

    class Meta:
        model = Specimen
        fields = [
            'id', 'nom', 'code_identification', 'nfc_tag_uid', 'organisme', 'organisme_nom',
            'organisme_nom_latin', 'garden', 'garden_nom', 'zone_jardin', 'statut', 'sante',
            'date_plantation', 'latitude', 'longitude',
        ]


class SpecimenDetailSerializer(serializers.ModelSerializer):
    """Détail complet d'un spécimen."""

    organisme = OrganismMinimalSerializer(read_only=True)
    garden = GardenMinimalSerializer(read_only=True)

    class Meta:
        model = Specimen
        fields = [
            'id', 'nom', 'code_identification', 'nfc_tag_uid', 'organisme', 'garden',
            'zone_jardin', 'latitude', 'longitude', 'date_plantation', 'age_plantation',
            'source', 'pepiniere_fournisseur', 'statut', 'sante', 'hauteur_actuelle',
            'premiere_fructification', 'notes', 'date_ajout', 'date_modification',
        ]


class SpecimenCreateUpdateSerializer(serializers.ModelSerializer):
    """Création / mise à jour de spécimen."""

    class Meta:
        model = Specimen
        fields = [
            'organisme', 'garden', 'nom', 'code_identification', 'nfc_tag_uid',
            'zone_jardin', 'latitude', 'longitude', 'date_plantation', 'age_plantation',
            'source', 'pepiniere_fournisseur', 'seed_collection', 'statut', 'sante',
            'hauteur_actuelle', 'premiere_fructification', 'notes',
        ]
        extra_kwargs = {
            'code_identification': {'required': False, 'allow_blank': True},
            'nfc_tag_uid': {'required': False, 'allow_blank': True},
        }

    def validate_nfc_tag_uid(self, value):
        """Normaliser '' → None pour éviter conflits unique (plusieurs NULL autorisés)."""
        if value is None:
            return None
        s = str(value).strip()
        return s if s else None


# --- Event ---
class EventSerializer(serializers.ModelSerializer):
    """Événement (journal rapide 2 taps)."""

    class Meta:
        model = Event
        fields = [
            'id', 'type_event', 'date', 'heure', 'titre', 'description',
            'quantite', 'unite', 'amendment', 'produit_utilise',
            'temperature', 'conditions_meteo', 'date_ajout',
        ]
        extra_kwargs = {
            'date': {'required': True},
            'type_event': {'required': True},
        }


class EventCreateSerializer(serializers.ModelSerializer):
    """Création événement (2 taps : type + date auto si non fournie)."""

    class Meta:
        model = Event
        fields = [
            'type_event', 'date', 'heure', 'titre', 'description',
            'quantite', 'unite', 'produit_utilise',
        ]
        extra_kwargs = {
            'date': {'required': False},
            'type_event': {'required': True},
        }

    def create(self, validated_data):
        from datetime import date
        if not validated_data.get('date'):
            validated_data['date'] = date.today()
        validated_data['specimen'] = self.context['specimen']
        return super().create(validated_data)


# --- Photo ---
class PhotoSerializer(serializers.ModelSerializer):
    """Photo (lecture)."""

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = [
            'id', 'image', 'image_url', 'type_photo', 'titre', 'description',
            'date_prise', 'date_ajout',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class PhotoCreateSerializer(serializers.ModelSerializer):
    """Upload de photo."""

    class Meta:
        model = Photo
        fields = ['image', 'type_photo', 'titre', 'description', 'date_prise']
        extra_kwargs = {
            'image': {'required': True},
        }


# --- UserTag (pour organismes, optionnel) ---
class UserTagSerializer(serializers.ModelSerializer):
    """Tags personnels."""

    class Meta:
        model = UserTag
        fields = ['id', 'nom', 'couleur', 'description']
