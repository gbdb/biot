# === TON EXERCICE ===
print("\n=== MON EXERCICE ===")

# Crée une classe Jardin qui:
# - A un attribut 'nom' (ex: "Mon potager")
# - A une liste de plantes (vide au départ)
# - A une méthode ajouter_plante(plante) qui ajoute à la liste
# - A une méthode compter_plantes() qui retourne le nombre
# - A une méthode arroser_tout() qui appelle .arroser() sur chaque plante

class Jardin:
    def __init__(self, nom):
        self.nom = nom
        self.list_de_plante = []
        pass
    
    def ajouter_plante(self, plante):
        # Ton code ici
        self.list_de_plante.append(plante)
        pass
    
    def compter_plantes(self):
        # Ton code ici
        return len(self.list_de_plante)
        pass
    
    def arroser_tout(self):
        # Ton code ici
        pass
    def Plante(self):
        pass

# Test (décommente quand prêt)
mon_jardin = Jardin("Potager du balcon")
# 
basilic = mon_jardin.Plante("Basilic", "Ocimum basilicum", "élevé")
tomate = mon_jardin.Plante("Tomate", "Solanum lycopersicum", "moyen")
# 
# mon_jardin.ajouter_plante(basilic)
# mon_jardin.ajouter_plante(tomate)
# 
# print(f"Mon jardin a {mon_jardin.compter_plantes()} plantes")
# mon_jardin.arroser_tout()