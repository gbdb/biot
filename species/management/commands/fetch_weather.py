"""
Récupère les données météo (Open-Meteo) pour tous les jardins.
À exécuter via cron quotidien : python manage.py fetch_weather
"""
from django.core.management.base import BaseCommand

from species.weather_service import fetch_weather_all_gardens


class Command(BaseCommand):
    help = "Récupère la météo pour tous les jardins (Open-Meteo)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=14,
            help="Nombre de jours à récupérer (défaut: 14)",
        )

    def handle(self, *args, **options):
        days = options["days"]
        result = fetch_weather_all_gardens(days_back=days)
        total = sum(result.values())
        for gid, count in result.items():
            self.stdout.write(f"  Jardin {gid}: {count} jours")
        self.stdout.write(self.style.SUCCESS(f"Météo récupérée: {total} enregistrements au total"))
