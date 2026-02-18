"""
Utilitaires d'export de données (CSV, PDF).
"""
import csv
from io import StringIO, BytesIO
from django.http import HttpResponse


def export_queryset_csv(queryset, fields_config, filename="export.csv"):
    """
    Exporte un queryset en CSV.
    fields_config: liste de (attr_name, header_label) ou (attr_name,) pour utiliser attr_name
    """
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.write("\ufeff")  # BOM UTF-8 pour Excel

    writer = csv.writer(response)
    headers = []
    attrs = []
    for item in fields_config:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            attrs.append(item[0])
            headers.append(item[1])
        else:
            attrs.append(item)
            headers.append(item.replace("_", " ").title())

    writer.writerow(headers)
    for obj in queryset:
        row = []
        for attr in attrs:
            val = getattr(obj, attr, "")
            if callable(val):
                val = val()
            if val is None:
                val = ""
            row.append(str(val))
        writer.writerow(row)

    return response


def export_organisms_csv(queryset, filename="organismes.csv"):
    """Export des organismes en CSV."""
    fields = [
        ("nom_commun", "Nom commun"),
        ("nom_latin", "Nom latin"),
        ("famille", "Famille"),
        ("regne", "Règne"),
        ("type_organisme", "Type"),
        ("besoin_eau", "Besoins eau"),
        ("besoin_soleil", "Besoins soleil"),
        ("zone_rusticite", "Zones rusticité"),
        ("comestible", "Comestible"),
        ("fixateur_azote", "Fixateur azote"),
        ("mellifere", "Mellifère"),
        ("description", "Description"),
    ]
    # zone_rusticite est JSON - besoin d'un accesseur
    return export_queryset_csv(queryset, fields, filename)


def export_organisms_csv_simple(queryset):
    """Version avec get_primary_zone pour zone_rusticite."""
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="organismes.csv"'
    response.write("\ufeff")

    writer = csv.writer(response)
    headers = [
        "Nom commun", "Nom latin", "Famille", "Règne", "Type",
        "Besoins eau", "Besoins soleil", "Zone rusticité",
        "Comestible", "Fixateur azote", "Mellifère", "Description"
    ]
    writer.writerow(headers)
    for obj in queryset:
        zone = obj.get_primary_zone() if hasattr(obj, "get_primary_zone") else ""
        writer.writerow([
            obj.nom_commun,
            obj.nom_latin,
            obj.famille or "",
            obj.get_regne_display() if hasattr(obj, "get_regne_display") else obj.regne,
            obj.get_type_organisme_display() if hasattr(obj, "get_type_organisme_display") else obj.type_organisme,
            obj.get_besoin_eau_display() if obj.besoin_eau and hasattr(obj, "get_besoin_eau_display") else (obj.besoin_eau or ""),
            obj.get_besoin_soleil_display() if obj.besoin_soleil and hasattr(obj, "get_besoin_soleil_display") else (obj.besoin_soleil or ""),
            zone,
            "Oui" if obj.comestible else "Non",
            "Oui" if obj.fixateur_azote else "Non",
            "Oui" if obj.mellifere else "Non",
            (obj.description or "")[:200],
        ])
    return response


def export_specimens_csv(queryset):
    """Export des spécimens en CSV."""
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="specimens.csv"'
    response.write("\ufeff")

    writer = csv.writer(response)
    headers = [
        "Nom", "Organisme", "Zone jardin", "Statut", "Date plantation",
        "Source", "Santé", "Code", "Latitude", "Longitude", "Notes"
    ]
    writer.writerow(headers)
    for obj in queryset:
        writer.writerow([
            obj.nom,
            obj.organisme.nom_commun if obj.organisme else "",
            obj.zone_jardin or "",
            obj.get_statut_display() if obj.statut else "",
            str(obj.date_plantation) if obj.date_plantation else "",
            obj.get_source_display() if obj.source else "",
            obj.sante,
            obj.code_identification or "",
            obj.latitude or "",
            obj.longitude or "",
            (obj.notes or "")[:200],
        ])
    return response


def export_seed_collections_csv(queryset):
    """Export des collections de semences en CSV."""
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="collections_semences.csv"'
    response.write("\ufeff")

    writer = csv.writer(response)
    headers = [
        "Organisme", "Variété", "Lot", "Fournisseur", "Quantité", "Unité",
        "Date récolte", "Stratification", "Notes"
    ]
    writer.writerow(headers)
    for obj in queryset:
        strat = ""
        if obj.stratification_requise:
            strat = f"{obj.stratification_duree_jours or '?'}j {obj.get_stratification_temp_display() or ''}"
        writer.writerow([
            obj.organisme.nom_commun if obj.organisme else "",
            obj.variete or "",
            obj.lot_reference or "",
            obj.fournisseur.nom if obj.fournisseur else "",
            obj.quantite or "",
            obj.get_unite_display() if obj.unite else "",
            str(obj.date_recolte) if obj.date_recolte else "",
            strat,
            (obj.notes or "")[:200],
        ])
    return response


def export_organisms_pdf(queryset):
    """Export des organismes en PDF."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    title = Paragraph(f"<b>Export Organismes - Jardin bIOT</b>", styles["Title"])
    story.append(title)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(f"{queryset.count()} organismes exportés", styles["Normal"]))
    story.append(Spacer(1, 0.5*cm))

    headers = ["Nom commun", "Nom latin", "Type", "Zone", "Comestible"]
    data = [headers]
    for obj in queryset[:100]:  # Limite pour PDF raisonnable
        zone = obj.get_primary_zone() if hasattr(obj, "get_primary_zone") else ""
        type_val = ""
        if hasattr(obj, "get_type_organisme_display") and obj.type_organisme:
            try:
                type_val = str(obj.get_type_organisme_display())[:25]
            except (AttributeError, ValueError):
                type_val = str(obj.type_organisme)[:25] if obj.type_organisme else "-"
        else:
            type_val = str(obj.type_organisme)[:25] if obj.type_organisme else "-"
        data.append([
            (obj.nom_commun or "")[:35],
            (obj.nom_latin or "-")[:35],
            type_val,
            zone[:10] if zone else "-",
            "Oui" if obj.comestible else "Non",
        ])

    table = Table(data, colWidths=[4*cm, 4*cm, 3*cm, 2*cm, 2*cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d5a27")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f8f0")]),
    ]))
    story.append(table)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
