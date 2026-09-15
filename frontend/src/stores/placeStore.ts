import {
  accessibilityFeatures,
  placeCategories,
  sourceLabels,
} from "../config/accessibility";
import { seedPlaces } from "../testing/mocks/places";
import { discoverOsmPlaces } from "../services/osmPlaces";
import type { MapPlace, PlaceInput } from "../types/place";
import { evaluateAccessibility } from "../utils/accessibility";
import { requireMockAdmin } from "./authStore";
import { readCollection, writeCollection } from "./mockStorage";

const KEY = "accessible-map:places:v9";
const CATALOG_VERSION_KEY = "accessible-map:places:catalog-version";
const CATALOG_VERSION = 10;

function readPlacesWithCatalogUpdates(): MapPlace[] {
  const storedPlaces = readCollection(KEY, seedPlaces);
  const [storedCatalogVersion = 0] = readCollection<number>(
    CATALOG_VERSION_KEY,
    [],
  );

  if (storedCatalogVersion >= CATALOG_VERSION) return storedPlaces;

  const storedIds = new Set(storedPlaces.map((place) => place.id));
  const additions = seedPlaces.filter((place) => !storedIds.has(place.id));
  const places = additions.length ? [...storedPlaces, ...additions] : storedPlaces;

  if (additions.length) writeCollection(KEY, places);
  writeCollection(CATALOG_VERSION_KEY, [CATALOG_VERSION]);
  return places;
}

export function getMockPlaces(): MapPlace[] {
  return readPlacesWithCatalogUpdates().map((place) => ({
    ...place,
    status: evaluateAccessibility(place.accessibility).status,
  }));
}
export async function getPlaces(signal?: AbortSignal): Promise<MapPlace[]> {
  const localPlaces = getMockPlaces();
  try {
    const importedPlaces = await discoverOsmPlaces(signal);
    if (!importedPlaces.length) return localPlaces;
    const localIds = new Set(localPlaces.map((place) => place.id));
    const additions = importedPlaces.filter((place) => !localIds.has(place.id));
    if (additions.length) writeCollection(KEY, [...localPlaces, ...additions]);
    return getMockPlaces();
  } catch {
    return localPlaces;
  }
}
export function saveMockPlace(input: PlaceInput, id?: string): MapPlace {
  requireMockAdmin();
  const category = placeCategories.find(
    (item) => item.label === input.category,
  );
  if (input.name.trim().length < 2 || input.name.trim().length > 160)
    throw new Error("Numele trebuie să aibă între 2 și 160 de caractere.");
  if (input.address.trim().length < 3 || input.address.length > 240)
    throw new Error("Introdu o adresă validă (maximum 240 de caractere).");
  if (input.note.trim().length < 10 || input.note.length > 2000)
    throw new Error(
      "Descrierea trebuie să aibă între 10 și 2000 de caractere.",
    );
  if (!category) throw new Error("Selectează o categorie validă.");
  const [latitude, longitude] = input.position;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    throw new Error("Coordonatele geografice nu sunt valide.");
  if (
    accessibilityFeatures.some(
      ({ key }) =>
        !["da", "nu", "necunoscut"].includes(input.accessibility[key]),
    )
  )
    throw new Error("Completează toate facilitățile.");
  if (!Object.prototype.hasOwnProperty.call(sourceLabels, input.source))
    throw new Error("Selectează sursa informațiilor.");
  if (input.source === "MOCK" && input.verified)
    throw new Error(
      "Locațiile din sursa locală trebuie verificate înainte de confirmare.",
    );
  const places = getMockPlaces();
  const previous = id ? places.find((place) => place.id === id) : undefined;
  if (id && !previous)
    throw new Error("Locația nu mai există. Actualizează lista.");
  const now = new Date().toISOString();
  const place: MapPlace = {
    ...input,
    name: input.name.trim(),
    address: input.address.trim(),
    note: input.note.trim(),
    accessibility: { ...input.accessibility },
    id: id ?? crypto.randomUUID(),
    categoryColor: category.color,
    status: evaluateAccessibility(input.accessibility).status,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  writeCollection(
    KEY,
    previous
      ? places.map((item) => (item.id === id ? place : item))
      : [...places, place],
  );
  return place;
}
export function deleteMockPlace(id: string) {
  requireMockAdmin();
  const places = getMockPlaces();
  if (!places.some((place) => place.id === id))
    throw new Error("Locația a fost deja ștearsă.");
  writeCollection(
    KEY,
    places.filter((place) => place.id !== id),
  );
}
