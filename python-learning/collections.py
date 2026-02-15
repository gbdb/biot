# === PARTIE 1: LISTES ===
print("=== LISTES ===")

# Créer une liste d'espèces
especes = ["Tomate", "Basilic", "Laitue", "Carotte"]
print("Mes espèces:", especes)

# Accéder à un élément (commence à 0!)
print("Première espèce:", especes[0])    # Tomate
print("Deuxième espèce:", especes[1])    # Basilic
print("Dernière espèce:", especes[-1])   # Carotte

# Ajouter une espèce
especes.append("Persil")
print("Après ajout:", especes)

# Nombre d'espèces
print("J'ai", len(especes), "espèces")

# Boucle sur toutes les espèces
print("\nMon jardin contient:")
for espece in especes:
    print(f"  - {espece}")
# === PARTIE 2: DICTIONNAIRES ===
print("\n=== DICTIONNAIRES === ~~~~~~~~")

# Un dictionnaire = paires clé: valeur
tomate = {
    "nom": "Tomate cerise",
    "hauteur": 1.5,
    "besoin_eau": "moyen",
    "comestible": True,
    "zone_rusticite": "5a"
}

# Accéder aux valeurs avec les clés
print("Nom:", tomate["nom"])
print("Hauteur:", tomate["hauteur"], "mètres")
print("Besoin en eau:", tomate["besoin_eau"])

# Modifier une valeur
tomate["hauteur"] = 1.8
print("Nouvelle hauteur:", tomate["hauteur"])

# Ajouter une nouvelle clé
tomate["couleur"] = "rouge"
print("\nInfos complètes:")
print(tomate)

# Boucle sur un dictionnaire
print("\nDétails de la plante:")
for cle, valeur2 in tomate.items():
    print(f"  {cle}: {valeur2}")


# === EXERCICE: Crée ton propre dictionnaire ===
print("\n=== MON EXERCICE ===")

# Crée un dictionnaire pour un Basilic avec:
basilic = {
    "nom": "Basilic enchante",
    "hauteur": 100.5,
    "besoin_eau": "enorme",
    "comestible": True,
    "zone_rusticite": "2a"
}


# Affiche le nom du basilic
print(basilic["nom"])

# Affiche toutes les infos
for cle, valeur in basilic.items():
    print(f"{cle}: {valeur}")

# === PARTIE 1: IF simple ===
print("=== CONDITIONS SIMPLES ===")

temperature = 25

if temperature > 30:
    print("Il fait trop chaud! Arrose tes plants!")

if temperature > 20:
    print("Température idéale pour le jardin")

if temperature < 10:
    print("Trop froid! Protège les plants")

print("Programme terminé")

# === PARTIE 2: IF/ELIF/ELSE ===
print("\n=== IF/ELIF/ELSE ===")

temperature = 25

if temperature > 30:
    print("🔥 Trop chaud!")
elif temperature > 20:
    print("✅ Température parfaite!")
elif temperature > 10:
    print("🌤️ Un peu frais")
else:
    print("❄️ Très froid!")

# === PARTIE 3: AND / OR ===
print("\n=== CONDITIONS MULTIPLES ===")

temperature = 25
humidite = 60

# AND = Les DEUX doivent être vrais
if temperature > 20 and humidite > 50:
    print("✅ Conditions parfaites pour planter!")

# OR = AU MOINS UN doit être vrai
if temperature > 35 or humidite < 20:
    print("⚠️ Conditions difficiles")

# IN = Vérifier si dans une liste
especes_disponibles = ["Tomate", "Basilic", "Laitue"]

if "Tomate" in especes_disponibles:
    print("👍 On a des tomates!")

if "Concombre" not in especes_disponibles:
    print("❌ Pas de concombres")

# === PARTIE 4: EXEMPLE JARDIN bIOT ===
print("\n=== ALERTE ARROSAGE ===")

plante = {
    "nom": "Basilic enchanté",
    "besoin_eau": "élevé",
    "jours_depuis_arrosage": 3
}

# Logique d'alerte
if plante["jours_depuis_arrosage"] > 2 and plante["besoin_eau"] == "élevé":
    print(f"⚠️ URGENT: {plante['nom']} a besoin d'eau!")
elif plante["jours_depuis_arrosage"] > 5:
    print(f"⚠️ {plante['nom']} devrait être arrosé bientôt")
else:
    print(f"✅ {plante['nom']} va bien")

# === TON EXERCICE ===
print("\n=== MON EXERCICE ===")

# Tu as ces informations sur une tomate:
tomate = {
    "nom": "Tomate cerise",
    "hauteur": 1.2,  # en mètres
    "jours_depuis_plantation": 45
}

# ÉCRIS un IF qui affiche:
# - Si hauteur > 1.5 → "Prête pour la taille!"
# - Si hauteur > 1.0 → "Bonne croissance"
# - Sinon → "Encore petite, sois patient"

# Ton code ici:

hauteur = 20

if hauteur > 1.5 :
    print("Prête pour la taille!")
elif hauteur > 1.0 :
    print("Bonne croissance")
else :
    print("Encore petite, sois patient")


# ÉCRIS un IF qui affiche:
# - Si jours_depuis_plantation > 60 → "Bientôt la récolte!"
# - Si jours_depuis_plantation > 30 → "En pleine croissance"
# - Sinon → "Jeune plant"

# Ton code ici:

jours_depuis_plantation = 70

if jours_depuis_plantation > 1.5 :
    print("Bientôt la récolte!")
elif jours_depuis_plantation > 1.0 :
    print("En pleine croissance")
else :
    print("Jeune plant")

