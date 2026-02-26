/**
 * Types alignés sur l'API Django REST (species/serializers.py)
 * Jardin Biot Mobile - Sync avec backend
 */

// --- Organism ---
export interface OrganismMinimal {
  id: number;
  nom_commun: string;
  nom_latin: string;
  type_organisme: string;
  is_favori?: boolean;
}

export interface OrganismDetail extends OrganismMinimal {
  famille: string;
  regne: string;
  besoin_eau: string;
  besoin_soleil: string;
  zone_rusticite?: { zone: string; source?: string }[];
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
}

export interface OrganismUpdate {
  nom_commun: string;
  nom_latin: string;
  famille?: string;
  regne?: string;
  type_organisme: string;
  besoin_eau?: string;
  besoin_soleil?: string;
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
  planifie: '📋 Planifié',
  commande: '🛒 Commandé',
  transplanter: '🌱 À transplanter',
  jeune: '🌿 Jeune plant',
  etabli: '🌳 Établi',
  mature: '🎯 Mature/Production',
  declin: '📉 En déclin',
  mort: '💀 Mort',
  enleve: '🗑️ Enlevé',
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
  /** Présent uniquement pour l'endpoint nearby */
  distance_km?: number;
}

export interface SpecimenDetail {
  id: number;
  nom: string;
  code_identification: string | null;
  nfc_tag_uid: string | null;
  organisme: OrganismMinimal;
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
}

export interface SpecimenCreateUpdate {
  organisme: number;
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
  | 'autre';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  plantation: '🌱 Plantation',
  arrosage: '💧 Arrosage',
  fertilisation: '🌿 Fertilisation',
  amendement: '🪨 Amendement sol',
  taille: '✂️ Taille/Élagage',
  paillage: '🍂 Paillage',
  observation: '👁️ Observation',
  floraison: '🌸 Floraison',
  fructification: '🍎 Fructification',
  recolte: '🧺 Récolte',
  maladie: '🦠 Maladie/Problème',
  traitement: '💊 Traitement',
  transplantation: '🚚 Transplantation',
  protection: '🛡️ Protection (hiver, animaux)',
  autre: '📝 Autre',
};

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
  arrosage: '💧 Arrosage',
  suivi_maladie: '🦠 Suivi de maladie',
  taille: '✂️ Taille',
  suivi_general: '👁️ Suivi général',
  cueillette: '🧺 Cueillette',
};

export const REMINDER_ALERTE_LABELS: Record<ReminderAlerteType, string> = {
  email: '📧 Email',
  popup: '🔔 Popup',
  son: '🔊 Son',
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
export interface Photo {
  id: number;
  image: string;
  image_url: string | null;
  type_photo: string | null;
  titre: string;
  description: string | null;
  date_prise: string | null;
  date_ajout: string;
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

// --- API responses ---
export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
