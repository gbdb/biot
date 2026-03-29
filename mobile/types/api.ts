/**
 * Types alignés sur l'API Django REST (species/serializers.py)
 * Jardin Biot Mobile - Sync avec backend
 */

// --- Organism ---
/** Réponse POST /api/organisms/missing-species-request/ (demande d’espèce vers Radix). */
export interface MissingSpeciesResponse {
  id: number;
  radix_organism_id: number;
  organism: { id: number; nom_latin: string; nom_commun: string } | null;
  message: string;
  radix?: unknown;
  sync_error?: boolean;
}

export interface OrganismMinimal {
  id: number;
  nom_commun: string;
  nom_latin: string;
  type_organisme: string;
  /** Genre botanique (ex. Amelanchier) pour regroupement en bibliothèque. */
  genus?: string | null;
  is_favori?: boolean;
  photo_principale_url?: string | null;
  /** Au moins un cultivar a un porte-greffe avec disponibilité (pépinière). */
  has_availability?: boolean;
}

export interface OrganismDetail extends OrganismMinimal {
  photos?: Photo[];
  famille: string;
  regne: string;
  besoin_eau: string;
  besoin_soleil: string;
  zone_rusticite?: { zone: string; source?: string }[];
  sol_textures?: string[];
  sol_ph?: string[];
  sol_drainage: string;
  sol_richesse: string;
  hauteur_max: number | null;
  largeur_max: number | null;
  vitesse_croissance: string;
  comestible: boolean;
  parties_comestibles: string;
  toxicite: string;
  type_noix: string;
  age_fructification: number | null;
  periode_recolte: string;
  pollinisation: string;
  production_annuelle: string;
  fixateur_azote: boolean;
  accumulateur_dynamique: boolean;
  mellifere: boolean;
  produit_juglone: boolean;
  indigene: boolean;
  description: string;
  notes: string;
  usages_autres: string;
  is_favori?: boolean;
  /** Propriétés sol/exposition par source (OrganismPropriete). */
  proprietes?: OrganismPropriete[];
  /** Usages (comestible, médicinal, etc.) par type (OrganismUsage). */
  usages?: OrganismUsage[];
  /** Périodes floraison, récolte, semis (OrganismCalendrier). */
  calendrier?: OrganismCalendrier[];
  /** Relations de compagnonnage (cette espèce ↔ autres). */
  companion_relations?: CompanionRelationItem[];
  /** Distance max pollinisation (m) pour cette espèce, si définie. */
  distance_pollinisation_max?: number | null;
  /** Variétés / cultivars de cette espèce. */
  cultivars?: CultivarDetail[];
  /** Note d'enrichissement de la fiche (0-100 %). */
  enrichment_score_pct?: number | null;
}

/** Entrée liste cultivars (API liste cultivars). */
export interface CultivarListEntry {
  id: number;
  slug_cultivar: string;
  nom: string;
  organisme: OrganismMinimal;
}

/** Porte-greffe d'un cultivar (CultivarPorteGreffe). */
export interface CultivarPorteGreffeEntry {
  id: number;
  nom_porte_greffe: string;
  vigueur: string;
  vigueur_display?: string;
  hauteur_max_m: number | null;
  disponible_chez: { source?: string; age?: string }[];
  notes: string;
}

/** Cultivar / variété (détail pour fiche espèce). */
export interface CultivarDetail {
  id: number;
  slug_cultivar: string;
  nom: string;
  description: string;
  couleur_fruit: string;
  gout: string;
  resistance_maladies: string;
  notes: string;
  pollinateurs_recommandes?: CultivarPollinatorCompanion[];
  porte_greffes?: CultivarPorteGreffeEntry[];
}

/** Compagnon pollinisateur recommandé pour un cultivar. */
export interface CultivarPollinatorCompanion {
  id: number;
  companion_cultivar: { id: number; nom: string; slug_cultivar: string } | null;
  companion_organism: { id: number; nom_commun: string; nom_latin: string } | null;
  notes: string;
  source: string;
}

/** Propriété sol/exposition (OrganismPropriete). */
export interface OrganismPropriete {
  id: number;
  type_sol: string[];
  ph_min: number | null;
  ph_max: number | null;
  tolerance_ombre: string;
  source: string;
}

/** Usage (comestible, médicinal, etc.) (OrganismUsage). */
export interface OrganismUsage {
  id: number;
  type_usage: string;
  type_usage_display: string;
  parties: string;
  description: string;
  source: string;
}

/** Période calendrier (OrganismCalendrier). */
export interface OrganismCalendrier {
  id: number;
  type_periode: string;
  type_periode_display: string;
  mois_debut: number | null;
  mois_fin: number | null;
  source: string;
}

/** Une relation de compagnonnage (cette espèce avec une autre). */
export interface CompanionRelationItem {
  id: number;
  direction: 'as_source' | 'as_target';
  other_organism: { id: number; nom_commun: string; nom_latin: string };
  type_relation: string;
  type_relation_display: string;
  force: number;
  distance_optimale: number | null;
  description: string;
  source_info: string;
  is_positive: boolean;
}

export interface OrganismUpdate {
  nom_commun: string;
  nom_latin: string;
  famille?: string;
  regne?: string;
  type_organisme: string;
  besoin_eau?: string;
  besoin_soleil?: string;
  sol_textures?: string[];
  sol_ph?: string[];
  sol_drainage?: string;
  sol_richesse?: string;
  hauteur_max?: number | null;
  largeur_max?: number | null;
  vitesse_croissance?: string;
  comestible?: boolean;
  parties_comestibles?: string;
  toxicite?: string;
  type_noix?: string;
  age_fructification?: number | null;
  periode_recolte?: string;
  pollinisation?: string;
  production_annuelle?: string;
  fixateur_azote?: boolean;
  accumulateur_dynamique?: boolean;
  mellifere?: boolean;
  produit_juglone?: boolean;
  indigene?: boolean;
  description?: string;
  notes?: string;
  usages_autres?: string;
}

// --- Garden ---
export interface GardenMinimal {
  id: number;
  nom: string;
  ville: string;
  adresse: string;
  latitude: number | null;
  longitude: number | null;
}

export interface GardenCreate {
  nom: string;
  ville?: string;
  adresse?: string;
}

/** Statistiques terrain (optionnel sur Garden). */
export interface TerrainStats {
  altitude_min?: number | null;
  altitude_max?: number | null;
  pente_moyenne?: number | null;
  surface_ha?: number | null;
  nb_cours_eau?: number | null;
}

/** Point de contrôle (GCP) pour calibration drone / OpenDroneMap. */
export interface GardenGCP {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
  photo_url?: string | null;
  date_capture?: string | null;
  notes?: string | null;
}

// --- Specimen ---
export type SpecimenStatut =
  | 'planifie'
  | 'commande'
  | 'transplanter'
  | 'jeune'
  | 'etabli'
  | 'mature'
  | 'declin'
  | 'mort'
  | 'enleve';

export const SPECIMEN_STATUT_LABELS: Record<SpecimenStatut, string> = {
  planifie: 'Planifié',
  commande: 'Commandé',
  transplanter: 'À transplanter',
  jeune: 'Jeune plant',
  etabli: 'Établi',
  mature: 'Mature/Production',
  declin: 'En déclin',
  mort: 'Mort',
  enleve: 'Enlevé',
};

/** Emoji par statut (pour pins carte 3D). */
export const SPECIMEN_STATUT_EMOJI: Record<SpecimenStatut, string> = {
  planifie: '📋',
  commande: '🛒',
  transplanter: '🌱',
  jeune: '🌿',
  etabli: '🌳',
  mature: '🎯',
  declin: '📉',
  mort: '💀',
  enleve: '🗑️',
};

export interface SpecimenList {
  id: number;
  nom: string;
  code_identification: string | null;
  nfc_tag_uid: string | null;
  organisme: number;
  organisme_nom: string;
  organisme_nom_latin: string;
  garden: number | null;
  garden_nom: string | null;
  zone_jardin: string | null;
  statut: SpecimenStatut;
  sante: number;
  date_plantation: string | null;
  latitude: number | null;
  longitude: number | null;
  is_favori?: boolean;
  photo_principale_url?: string | null;
  /** Rayon adulte estimé (m) pour cercle d'emprise sur la carte 3D. */
  rayon_adulte_m?: number | null;
  /** Présent uniquement pour l'endpoint nearby */
  distance_km?: number;
}

/** Entrée calendrier espèce (floraison, fructification, récolte, etc.). */
export interface OrganismCalendrierEntry {
  id: number;
  type_periode: string;
  type_periode_display?: string;
  mois_debut: number | null;
  mois_fin: number | null;
  source?: string;
}

export interface SpecimenDetail {
  id: number;
  nom: string;
  code_identification: string | null;
  nfc_tag_uid: string | null;
  organisme: OrganismMinimal;
  organism_calendrier?: OrganismCalendrierEntry[];
  cultivar?: { id: number; nom: string; slug_cultivar: string } | null;
  garden: GardenMinimal | null;
  zone_jardin: string | null;
  latitude: number | null;
  longitude: number | null;
  date_plantation: string | null;
  age_plantation: number | null;
  source: string | null;
  pepiniere_fournisseur: string | null;
  statut: SpecimenStatut;
  sante: number;
  hauteur_actuelle: number | null;
  premiere_fructification: number | null;
  notes: string | null;
  date_ajout: string;
  date_modification: string;
  is_favori?: boolean;
  photo_principale?: number | null;
  photo_principale_url?: string | null;
  /** Groupes de pollinisation (mâle/femelle ou cultivars) avec distance et alerte. */
  pollination_associations?: PollinationAssociation[];
  /** Rayon adulte estimé (m) pour cercle d'emprise sur la carte 3D. */
  rayon_adulte_m?: number | null;
}

/** Types de messages WebView ↔ Cesium (terrain 3D). */
export type CesiumMessageType =
  | 'LOAD_SPECIMENS'
  | 'LOAD_WARNINGS'
  | 'LOAD_GCPs'
  | 'FLY_TO_SPECIMEN'
  | 'FLY_HOME'
  | 'TOGGLE_CIRCLES'
  | 'SET_VIEW_MODE'
  | 'CESIUM_READY'
  | 'SPECIMEN_TAPPED'
  | 'SPECIMEN_OPEN_FICHE'
  | 'SPECIMEN_SELECTED'
  | 'OVERLAPS_DETECTED'
  | 'OPEN_GCP_CREATE';

/** Chevauchement détecté entre deux cercles d'emprise (vue terrain). */
export interface CesiumOverlap {
  a: number;
  b: number;
  distance_m: number;
  min_recommended: number;
}

/** Une association de pollinisation (ce specimen dans un groupe). */
export interface PollinationAssociation {
  group_id: number;
  type_groupe: 'male_female' | 'cross_pollination_cultivar';
  role: string | null;
  other_members: PollinationOtherMember[];
}

export interface PollinationOtherMember {
  specimen_id: number;
  nom: string;
  organisme_nom: string | null;
  cultivar_nom: string | null;
  role: string | null;
  statut: string;
  distance_metres: number | null;
  alerte_distance: boolean;
}

export interface SpecimenCreateUpdate {
  organisme: number;
  cultivar?: number | null;
  garden: number | null;
  nom?: string;
  code_identification?: string;
  nfc_tag_uid?: string;
  zone_jardin?: string;
  latitude?: number | null;
  longitude?: number | null;
  date_plantation?: string | null;
  age_plantation?: number | null;
  source?: string;
  pepiniere_fournisseur?: string;
  seed_collection?: number | null;
  statut?: SpecimenStatut;
  sante?: number;
  hauteur_actuelle?: number | null;
  premiere_fructification?: number | null;
  notes?: string;
}

// --- Event ---
export type EventType =
  | 'plantation'
  | 'arrosage'
  | 'fertilisation'
  | 'amendement'
  | 'taille'
  | 'paillage'
  | 'observation'
  | 'floraison'
  | 'fructification'
  | 'recolte'
  | 'maladie'
  | 'traitement'
  | 'transplantation'
  | 'protection'
  | 'autre'
  | 'mort'
  | 'enlever';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  plantation: 'Plantation',
  arrosage: 'Arrosage',
  fertilisation: 'Fertilisation',
  amendement: 'Amendement sol',
  taille: 'Taille/Élagage',
  paillage: 'Paillage',
  observation: 'Observation',
  floraison: 'Floraison',
  fructification: 'Fructification',
  recolte: 'Récolte',
  maladie: 'Maladie/Problème',
  traitement: 'Traitement',
  transplantation: 'Transplantation',
  protection: 'Protection (hiver, animaux)',
  autre: 'Autre',
  mort: 'Mort',
  enlever: 'Enlevé',
};

/** Événement récent avec infos spécimen et photo (accueil / liste globale). */
export interface RecentEvent {
  event_id: number;
  type_event: EventType;
  date: string;
  titre: string;
  specimen_id: number;
  specimen_nom: string;
  photo_url: string | null;
}

export interface Event {
  id: number;
  type_event: EventType;
  date: string;
  heure: string | null;
  titre: string;
  description: string;
  quantite: number | null;
  unite: string | null;
  amendment: number | null;
  produit_utilise: string | null;
  temperature: number | null;
  conditions_meteo: string | null;
  date_ajout: string;
}

export interface EventCreate {
  type_event: EventType;
  date?: string;
  heure?: string | null;
  titre?: string;
  description?: string;
  quantite?: number | null;
  unite?: string | null;
  produit_utilise?: string;
}

// --- Reminder ---
export type ReminderType =
  | 'arrosage'
  | 'suivi_maladie'
  | 'taille'
  | 'suivi_general'
  | 'cueillette';

export type ReminderAlerteType = 'email' | 'popup' | 'son';

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  arrosage: 'Arrosage',
  suivi_maladie: 'Suivi de maladie',
  taille: 'Taille',
  suivi_general: 'Suivi général',
  cueillette: 'Cueillette',
};

export const REMINDER_ALERTE_LABELS: Record<ReminderAlerteType, string> = {
  email: 'Email',
  popup: 'Popup',
  son: 'Son',
};

export type ReminderRecurrenceRule = 'none' | 'biweekly' | 'annual' | 'biannual';

export const REMINDER_RECURRENCE_LABELS: Record<ReminderRecurrenceRule, string> = {
  none: 'Aucune',
  biweekly: 'Toutes les 2 semaines',
  annual: 'Annuel',
  biannual: 'Bi-annuel (2×/an)',
};

export interface Reminder {
  id: number;
  type_rappel: ReminderType;
  date_rappel: string;
  type_alerte: ReminderAlerteType;
  titre: string;
  description: string;
  recurrence_rule?: ReminderRecurrenceRule;
  date_ajout: string;
}

export interface ReminderCreate {
  type_rappel: ReminderType;
  date_rappel: string;
  type_alerte?: ReminderAlerteType;
  titre?: string;
  description?: string;
  recurrence_rule?: ReminderRecurrenceRule;
}

// --- Photo ---
export interface PhotoEventSummary {
  id: number;
  type_event: string;
  date: string;
  titre: string;
}

export interface Photo {
  id: number;
  image: string;
  image_url: string | null;
  type_photo: string | null;
  titre: string;
  description: string | null;
  date_prise: string | null;
  date_ajout: string;
  source_url?: string;
  source_author?: string;
  source_license?: string;
  /** Présent si la photo est liée à un événement (specimen). */
  event_id?: number | null;
  event?: PhotoEventSummary | null;
}

export interface PhotoCreate {
  image: { uri: string; type?: string; name?: string };
  type_photo?: string;
  titre?: string;
  description?: string;
  date_prise?: string | null;
}

// --- Auth ---
export interface TokenPair {
  access: string;
  refresh: string;
}

// --- Warnings (accueil jardin) ---
export interface OverdueReminderWarning {
  reminder_id: number;
  specimen_id: number;
  specimen_nom: string;
  type_rappel: string;
  date_rappel: string;
  jours_retard: number;
}

export interface MissingPollinatorWarning {
  specimen_id: number;
  specimen_nom: string;
  cultivar_nom: string;
  pollinisateurs_manquants: string[];
}

export interface PhenologyAlertWarning {
  specimen_id: number;
  specimen_nom: string;
  organisme_nom: string;
  type_periode: string;
  mois_debut: number;
  jours_restants: number;
}

export interface GardenWarningsResponse {
  overdue_reminders: OverdueReminderWarning[];
  missing_pollinators: MissingPollinatorWarning[];
  phenology_alerts: PhenologyAlertWarning[];
  total_count: number;
}

// --- Compagnonnage spécimen ---
export interface CompanionEntry {
  organisme_nom: string;
  type_relation: string;
  type_relation_display: string;
  force: number;
  distance_optimale: number | null;
  status: 'ACTIF' | 'TROP_LOIN' | 'MANQUANT';
  distance_metres: number | null;
  specimen_id?: number;
  specimen_nom?: string;
}

export interface SpecimenCompanions {
  benefices_de: { actifs: CompanionEntry[]; manquants: CompanionEntry[] };
  aide_a: { actifs: CompanionEntry[]; manquants: CompanionEntry[] };
}

// --- API responses ---
export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
