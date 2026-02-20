"""
Tests pour l'app species - API REST (mobile) et serializers critiques.
"""
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Garden, Organism, Specimen

User = get_user_model()


def create_test_data():
    """Crée des données de test minimales."""
    user = User.objects.create_user(username="testuser", password="testpass123")
    garden = Garden.objects.create(nom="Jardin Test", ville="Montréal")
    organism = Organism.objects.create(
        nom_commun="Pommier Dolgo",
        nom_latin="Malus 'Dolgo'",
        type_organisme="arbre_fruitier",
    )
    specimen = Specimen.objects.create(
        organisme=organism,
        garden=garden,
        nom="Pomme 1",
        statut="jeune",
        sante=5,
    )
    return user, garden, organism, specimen


class SpecimenAPITestCase(TestCase):
    """Tests API spécimens (endpoints utilisés par l'app mobile)."""

    def setUp(self):
        self.client = APIClient()
        self.user, self.garden, self.organism, self.specimen = create_test_data()

    def test_list_specimens_requires_auth(self):
        """Liste des spécimens requiert authentification."""
        resp = self.client.get("/api/specimens/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_specimens_authenticated(self):
        """Liste des spécimens avec JWT (réponse paginée)."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/api/specimens/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get("results", resp.data) if isinstance(resp.data, dict) else resp.data
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]["nom"], "Pomme 1")
        self.assertEqual(results[0]["organisme_nom"], "Pommier Dolgo")

    def test_detail_specimen(self):
        """Détail d'un spécimen."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/api/specimens/{self.specimen.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["nom"], "Pomme 1")
        self.assertIn("organisme", resp.data)
        self.assertIn("garden", resp.data)

    def test_create_specimen(self):
        """Création d'un spécimen via API."""
        self.client.force_authenticate(user=self.user)
        data = {
            "organisme": self.organism.id,
            "garden": self.garden.id,
            "nom": "Pomme 2",
            "statut": "jeune",
            "sante": 5,
        }
        resp = self.client.post("/api/specimens/", data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["nom"], "Pomme 2")
        self.assertEqual(Specimen.objects.count(), 2)

    def test_filter_specimens_by_garden(self):
        """Filtre par jardin."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/api/specimens/?garden={self.garden.id}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get("results", resp.data) if isinstance(resp.data, dict) else resp.data
        self.assertGreaterEqual(len(results), 1)

    def test_create_event_on_specimen(self):
        """Ajout d'un événement sur un spécimen (flow 'ajouter événement')."""
        self.client.force_authenticate(user=self.user)
        data = {
            "type_event": "arrosage",
            "titre": "Arrosage matin",
        }
        resp = self.client.post(
            f"/api/specimens/{self.specimen.id}/events/",
            data,
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["type_event"], "arrosage")
        self.assertEqual(resp.data["titre"], "Arrosage matin")
        self.assertIsNotNone(resp.data.get("date"))


class SpecimenSerializerTestCase(TestCase):
    """Tests des serializers critiques."""

    def setUp(self):
        self.user, self.garden, self.organism, self.specimen = create_test_data()

    def test_code_identification_normalized_to_none(self):
        """code_identification vide → None pour éviter conflit unique."""
        from .serializers import SpecimenCreateUpdateSerializer

        serializer = SpecimenCreateUpdateSerializer(
            data={
                "organisme": self.organism.id,
                "garden": self.garden.id,
                "nom": "Test code",
                "code_identification": "   ",
                "statut": "jeune",
                "sante": 5,
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data["code_identification"])

    def test_event_create_without_date_uses_today(self):
        """EventCreateSerializer : date absente → aujourd'hui."""
        from .serializers import EventCreateSerializer

        serializer = EventCreateSerializer(
            data={"type_event": "observation", "titre": "Vu une fleur"},
            context={"specimen": self.specimen, "request": None},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        ev = serializer.save()
        self.assertEqual(ev.date, date.today())
        self.assertEqual(ev.type_event, "observation")


class SpecimenByNfcAPITestCase(TestCase):
    """Tests lookup NFC / code_identification."""

    def setUp(self):
        self.client = APIClient()
        self.user, self.garden, self.organism, _ = create_test_data()
        self.specimen = Specimen.objects.create(
            organisme=self.organism,
            garden=self.garden,
            nom="Pomme NFC",
            statut="jeune",
            sante=5,
            nfc_tag_uid="04A1B2C3D4E5F6",
        )
        self.client.force_authenticate(user=self.user)

    def test_by_nfc_found_by_nfc_tag_uid(self):
        """Lookup par nfc_tag_uid."""
        resp = self.client.get(
            f"/api/specimens/by-nfc/{self.specimen.nfc_tag_uid}/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["nom"], "Pomme NFC")

    def test_by_nfc_not_found(self):
        """Lookup avec UID inexistant."""
        resp = self.client.get("/api/specimens/by-nfc/UNKNOWN_UID/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
