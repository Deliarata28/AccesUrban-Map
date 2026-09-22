import {
  accessibilityFeatures,
  placeCategories,
} from "../config/accessibility";
import type {
  AccessibilityFeature,
  AccessibilityValue,
  MapPlace,
  PlaceInput,
  PlaceSource,
} from "../types/place";
import { evaluateAccessibility } from "../utils/accessibility";
import { apiRequest } from "./apiClient";

type ApiPlaceSource = "Manual" | "OpenStreetMap" | "FieldSurvey" | "PublicData";

type ApiAccessibility = {
  wheelchairAccess: boolean | null;
  ramp: boolean | null;
  stepFreeEntry: boolean | null;
  elevator: boolean | null;
  accessibleToilet: boolean | null;
  accessibleParking: boolean | null;
  tactilePaving: boolean | null;
  audioSignal: boolean | null;
  score: number;
};

type ApiPlace = {
  id: number;
  name: string;
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  source: ApiPlaceSource;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  accessibility: ApiAccessibility | null;
};

const fromBoolean = (value: boolean | null | undefined): AccessibilityValue =>
  value === true ? "da" : value === false ? "nu" : "necunoscut";

const toBoolean = (value: AccessibilityValue): boolean | null =>
  value === "da" ? true : value === "nu" ? false : null;

const sourceFromApi: Record<ApiPlaceSource, PlaceSource> = {
  Manual: "MANUAL",
  OpenStreetMap: "OSM",
  FieldSurvey: "FIELD_SURVEY",
  PublicData: "PUBLIC_DATA",
};

const sourceToApi: Record<PlaceSource, ApiPlaceSource> = {
  MOCK: "Manual",
  MANUAL: "Manual",
  OSM: "OpenStreetMap",
  FIELD_SURVEY: "FieldSurvey",
  PUBLIC_DATA: "PublicData",
};

// Primele trei locuri au fost create înainte ca interfața să folosească
// etichete românești. Păstrăm datele existente, dar le afișăm consecvent.
const categoryLabels: Record<string, string> = {
  hospital: "Spital",
  pharmacy: "Farmacie",
  public: "Instituție publică",
  culture: "Instituție publică",
  park: "Parc",
  restaurant: "Restaurant",
  transport: "Transport",
  shopping: "Centru comercial",
};

const emptyAccessibility = (): Record<AccessibilityFeature, AccessibilityValue> => ({
  rampa: "necunoscut",
  intrareFaraTrepte: "necunoscut",
  lift: "necunoscut",
  toaletaAccesibila: "necunoscut",
  parcareAccesibila: "necunoscut",
  pavajTactil: "necunoscut",
  semnalAudio: "necunoscut",
});

export function mapApiPlace(place: ApiPlace): MapPlace {
  const category = categoryLabels[place.category] ?? place.category;
  const accessibility = place.accessibility
    ? {
        rampa: fromBoolean(place.accessibility.ramp),
        intrareFaraTrepte: fromBoolean(place.accessibility.stepFreeEntry),
        lift: fromBoolean(place.accessibility.elevator),
        toaletaAccesibila: fromBoolean(place.accessibility.accessibleToilet),
        parcareAccesibila: fromBoolean(place.accessibility.accessibleParking),
        pavajTactil: fromBoolean(place.accessibility.tactilePaving),
        semnalAudio: fromBoolean(place.accessibility.audioSignal),
      }
    : emptyAccessibility();
  const categoryColor = placeCategories.find((item) => item.label === category)?.color ?? "#9caab2";

  return {
    id: String(place.id),
    name: place.name,
    address: place.address,
    position: [place.latitude, place.longitude],
    note: place.description,
    category,
    categoryColor,
    accessibility,
    status: evaluateAccessibility(accessibility).status,
    source: sourceFromApi[place.source],
    verified: place.isVerified,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
  };
}

function toRequest(input: PlaceInput) {
  const ramp = toBoolean(input.accessibility.rampa);
  const stepFreeEntry = toBoolean(input.accessibility.intrareFaraTrepte);
  const wheelchairAccess = stepFreeEntry === true && ramp !== false
    ? true
    : stepFreeEntry === false
      ? false
      : null;

  return {
    name: input.name,
    description: input.note,
    category: input.category,
    address: input.address,
    latitude: input.position[0],
    longitude: input.position[1],
    source: sourceToApi[input.source],
    isVerified: input.verified,
    accessibility: {
      wheelchairAccess,
      ramp,
      stepFreeEntry,
      elevator: toBoolean(input.accessibility.lift),
      accessibleToilet: toBoolean(input.accessibility.toaletaAccesibila),
      accessibleParking: toBoolean(input.accessibility.parcareAccesibila),
      tactilePaving: toBoolean(input.accessibility.pavajTactil),
      audioSignal: toBoolean(input.accessibility.semnalAudio),
    },
  };
}

export async function getApiPlaces(signal?: AbortSignal) {
  const places = await apiRequest<ApiPlace[]>("/places", { signal });
  return places.map(mapApiPlace);
}

export async function saveApiPlace(input: PlaceInput, id?: string) {
  const method = id ? "PUT" : "POST";
  const path = id ? `/places/${id}` : "/places";
  const place = await apiRequest<ApiPlace>(path, {
    method,
    body: JSON.stringify(toRequest(input)),
  });
  return mapApiPlace(place);
}

export async function deleteApiPlace(id: string) {
  await apiRequest<void>(`/places/${id}`, { method: "DELETE" });
}
