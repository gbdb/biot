"""
AdminSite personnalisé : compatible Django 5 get_app_list(request, app_label=None).
Corrige l'erreur lorsque l'on clique sur un groupe du menu (ex: Mon BIOT).
"""
from admin_reorder import ReorderingAdminSite, _build_new_order


class JardinBiotAdminSite(ReorderingAdminSite):
    """AdminSite compatible Django 5 : get_app_list accepte app_label."""

    site_header = "BIOT : Administration"
    site_title = "BIOT : Administration"
    index_title = "Administration"

    def get_app_list(self, request, app_label=None):
        """
        Django 5 appelle get_app_list(request, app_label) pour la page app_index.
        Le package admin_reorder n'acceptait que (request).
        """
        app_dict = self._build_app_dict(request, app_label)
        app_list = list(app_dict.values())
        return list(_build_new_order(app_list))
