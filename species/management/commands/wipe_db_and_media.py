"""
Vide la base de données et supprime les fichiers médias (photos).
À utiliser avant de repartir de zéro (Plan 1 - étape 0).

Usage:
  python manage.py wipe_db_and_media           # flush DB + supprime media/
  python manage.py wipe_db_and_media --db-only   # flush DB uniquement
  python manage.py wipe_db_and_media --media-only  # supprime media/ uniquement
"""
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Vide la base de données (flush) et supprime le contenu de MEDIA_ROOT (ex: media/). "
        "Optionnel: --db-only ou --media-only pour ne faire qu'une des deux actions."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--db-only",
            action="store_true",
            help="Vider uniquement la base (flush), ne pas toucher aux fichiers médias",
        )
        parser.add_argument(
            "--media-only",
            action="store_true",
            help="Supprimer uniquement le contenu de media/, ne pas vider la base",
        )
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Ne pas demander de confirmation (pour scripts)",
        )

    def handle(self, *args, **options):
        db_only = options["db_only"]
        media_only = options["media_only"]
        no_input = options["no_input"]

        if not db_only and not media_only:
            do_db = True
            do_media = True
        else:
            do_db = db_only
            do_media = media_only

        if not no_input and (do_db or do_media):
            msg = "Vider la base et supprimer les médias" if (do_db and do_media) else (
                "Vider la base" if do_db else "Supprimer le contenu de media/"
            )
            if input(f"Êtes-vous sûr de vouloir {msg} ? (oui/non): ").strip().lower() != "oui":
                self.stdout.write(self.style.WARNING("Annulé."))
                return

        if do_db:
            self.stdout.write("Vidage de la base de données...")
            call_command("flush", verbosity=0, interactive=False, database="default")
            self.stdout.write(self.style.SUCCESS("Base vidée."))

        if do_media:
            media_root = Path(settings.MEDIA_ROOT)
            if not media_root.exists():
                self.stdout.write(self.style.WARNING(f"MEDIA_ROOT n'existe pas: {media_root}"))
            else:
                deleted = 0
                for item in media_root.iterdir():
                    try:
                        if item.is_dir():
                            shutil.rmtree(item)
                        else:
                            item.unlink()
                        deleted += 1
                    except OSError as e:
                        self.stdout.write(self.style.WARNING(f"Impossible de supprimer {item}: {e}"))
                self.stdout.write(self.style.SUCCESS(f"Contenu de {media_root} supprimé ({deleted} éléments)."))
