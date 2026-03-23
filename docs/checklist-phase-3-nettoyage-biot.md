# Checklist — Phase 3 suite (BIOT : read-only botanique + nettoyage)

**Statut : terminé (mars 2026)** — UI `/admin/gestion-donnees/` validée (bandeau Radix Sylva + lien `https://radix.jardinbiot.ca/api/v1`). Passage à la **phase 4** : [plan-radix-biot-phases.md](plan-radix-biot-phases.md).

## A. Documentation

- [x] **README principal** — paragraphe Radix / prod / `sync_radixsylva`.
- [x] **`docs/import-especes-et-fusion-sources.md`** — encadré Radix + §1.1 réécrit (Pass C).
- [x] **`docs/dev-postgres-etapes-3-4.md`** — URL HTTPS prod Radix.
- [x] **`context.md`** + **`docs/prochaines-etapes.md`** — rôle Radix vs BIOT.

---

## B. Interface web BIOT

- [x] **`gestion_donnees.html`** — bandeau avec lien `https://radix.jardinbiot.ca/api/v1`.
- [x] **Manuel** — parcours `/admin/gestion-donnees/` (staff) validé.
- [ ] **Admin PFAF** (optionnel) — vérifier message Radix si tu ouvres encore cette page.

---

## C. API mobile / backend

- [ ] **App** — Paramètres → Avancé (smoke test quand tu attaques la phase 4 mobile).
- [x] **Code** — `ALLOWED_ADMIN_COMMANDS` + `ImportVascanFileView` → 410.
- [ ] **`run-command`** — test API optionnel.

---

## D. Inventaire commandes

- [x] **`docs/species-management-commands-inventory.md`**
- [ ] **Imports croisés** `enrichment.py` — optionnel / dette future.

---

## E. Vérification `.env` / sync

- [x] **`RADIX_SYLVA_API_URL`** = prod Radix (HTTPS) pour la sync quotidienne.
- [x] **`sync_radixsylva --full`** déjà validé (559 org., 1010 cultivars).

---

## Suite

- **Phase 4** — [plan-radix-biot-phases.md](plan-radix-biot-phases.md) (E2E, déploiement BIOT, mobile prod).

---

**Fichiers utiles**

| Sujet | Fichier |
|--------|---------|
| Plan global | `docs/plan-radix-biot-phases.md` |
| Pass C | `docs/radix-biot-pass-c.md` |
| Inventaire commandes | `docs/species-management-commands-inventory.md` |
| Sync Radix | `species/management/commands/sync_radixsylva.py` |
