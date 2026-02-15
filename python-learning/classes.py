# === PARTIE 3: COMME DANS DJANGO ===
print("\n=== PREVIEW DJANGO ===")

# Ceci ressemble BEAUCOUP aux modèles Django!
class Species:
    """Modèle d'une espèce de plante"""
    
    def __init__(self, nom_commun, nom_latin, famille):
        self.nom_commun = nom_commun
        self.nom_latin = nom_latin
        self.famille = famille
        self.specimens = []  # Liste de spécimens de cette espèce
    
    def ajouter_specimen(self, specimen):
        """Ajoute un spécimen de cette espèce"""
        self.specimens.append(specimen)
        print(f"✅ {specimen.nom} ajouté à l'espèce {self.nom_commun}")
    
    def compter_specimens(self):
        """Compte combien de spécimens de cette espèce"""
        return len(self.specimens)

class Specimen:
    """Modèle d'un plant individuel"""
    
    def __init__(self, nom, species, date_plantation):
        self.nom = nom
        self.species = species  # Lien vers l'espèce
        self.date_plantation = date_plantation
        self.evenements = []
    
    def ajouter_evenement(self, type_event, note):
        """Ajoute un événement (arrosage, taille, etc)"""
        event = {
            "type": type_event,
            "note": note
        }
        self.evenements.append(event)
        print(f"📝 Événement ajouté: {type_event} - {note}")

# Utilisation (comme tu vas faire dans Django!)
tomate_espece = Species("Tomate cerise", "Solanum lycopersicum", "Solanaceae")

# Créer des spécimens individuels
tomate1 = Specimen("Tomate #1", tomate_espece, "2026-05-15")
tomate2 = Specimen("Tomate #2", tomate_espece, "2026-05-20")

# Lier les spécimens à l'espèce
tomate_espece.ajouter_specimen(tomate1)
tomate_espece.ajouter_specimen(tomate2)

print(f"\nJ'ai {tomate_espece.compter_specimens()} plants de {tomate_espece.nom_commun}")

# Logger des événements
tomate1.ajouter_evenement("arrosage", "Arrosé 2L")
tomate1.ajouter_evenement("taille", "Enlevé gourmands")

print(f"\n{tomate1.nom} a {len(tomate1.evenements)} événements")