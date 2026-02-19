"""
Configuration admin personnalisée pour le regroupement du menu
(Mon BIOT, Contrôles, Configurations et importation de données).
"""
from django.contrib.admin.apps import AdminConfig


class JardinBiotAdminConfig(AdminConfig):
    default_site = "jardinbiot.admin_site.JardinBiotAdminSite"
