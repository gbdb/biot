# === PARTIE 1: FONCTION SIMPLE ===
print("=== FONCTIONS SIMPLES ===")

# Définir une fonction
def saluer():
    print("🌱 Bonjour jardinier!")
    print("Bienvenue dans Jardin bIOT")

# Appeler la fonction
saluer()
saluer()  # On peut l'appeler plusieurs fois!

# === PARTIE 2: AVEC PARAMÈTRES ===
print("\n=== AVEC PARAMÈTRES ===")

def saluer_plante(nom):
    print(f"Salut {nom}! Comment vas-tu aujourd'hui?")

# Appels avec différents noms
saluer_plante("Basilic")
saluer_plante("Tomate cerise")
saluer_plante("Laitue")

# Fonction avec plusieurs paramètres
def afficher_infos(nom, hauteur, age_jours):
    print(f"{nom}: {hauteur}m de haut, {age_jours} jours")

afficher_infos("Tomate #1", 1.2, 45)
afficher_infos("Basilic", 0.3, 20)

# === PARTIE 3: RETURN (retourner une valeur) ===
print("\n=== RETURN ===")

def calculer_besoin_eau(hauteur, besoin):
    if besoin == "élevé":
        litres = hauteur * 3
    elif besoin == "moyen":
        litres = hauteur * 2
    else:
        litres = hauteur * 1
    
    return litres  # Renvoie la valeur

# Utilisation
eau_basilic = calculer_besoin_eau(0.3, "élevé")
print(f"Basilic a besoin de {eau_basilic} litres")

eau_tomate = calculer_besoin_eau(1.2, "moyen")
print(f"Tomate a besoin de {eau_tomate} litres")

# On peut utiliser le résultat directement
if calculer_besoin_eau(2.0, "faible") > 1.5:
    print("Beaucoup d'eau nécessaire!")

# === PARTIE 4: FONCTION COMPLÈTE ===
print("\n=== CRÉER UNE PLANTE ===")

def creer_plante(nom, espece, hauteur, besoin_eau):
    """Crée un dictionnaire représentant une plante"""
    plante = {
        "nom": nom,
        "espece": espece,
        "hauteur": hauteur,
        "besoin_eau": besoin_eau,
        "jours_depuis_arrosage": 0
    }
    return plante

# Créer plusieurs plantes facilement!
basilic = creer_plante("Basilic du balcon", "Ocimum basilicum", 0.3, "élevé")
tomate = creer_plante("Tomate #1", "Solanum lycopersicum", 1.2, "moyen")
cactus = creer_plante("Cactus Bob", "Cactaceae", 0.15, "faible")

print(basilic)
print(tomate)
print(cactus)

# Fonction pour vérifier si arrosage nécessaire
def besoin_arrosage(plante):
    """Retourne True si la plante a besoin d'eau"""
    jours = plante["jours_depuis_arrosage"]
    besoin = plante["besoin_eau"]
    
    if besoin == "élevé" and jours > 2:
        return True
    elif besoin == "moyen" and jours > 4:
        return True
    elif besoin == "faible" and jours > 7:
        return True
    else:
        return False

# Test
basilic["jours_depuis_arrosage"] = 3

if besoin_arrosage(basilic):
    print(f"⚠️ {basilic['nom']} a besoin d'eau!")
else:
    print(f"✅ {basilic['nom']} va bien")

# === TON EXERCICE ===
print("\n=== MON EXERCICE ===")

# ÉCRIS une fonction qui:
# - Prend en paramètre: nom et jours_depuis_plantation
# - Retourne un message selon l'âge:
#   * > 60 jours → "Bientôt la récolte!"
#   * > 30 jours → "En pleine croissance"
#   * Sinon → "Jeune plant"

def statut_croissance(nom, jours_depuis_plantation):
    # Ton code ici
    if jours_depuis_plantation > 60: 
        return "Bientôt la récolte!"
    elif jours_depuis_plantation > 30: 
        return "En pleine croissance"
    else: 
        return "Jeune plant" 
    

# Test de ta fonction
print(statut_croissance("Tomate", 70))   # Devrait afficher: Bientôt la récolte!
print(statut_croissance("Basilic", 40))  # Devrait afficher: En pleine croissance
print(statut_croissance("Laitue", 15))   # Devrait afficher: Jeune plant