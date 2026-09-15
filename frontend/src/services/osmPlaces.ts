import { placeCategories } from "../config/accessibility";
import type {
  AccessibilityFeature,
  AccessibilityValue,
  MapPlace,
} from "../types/place";

const CHISINAU_BBOX = "46.94,28.74,47.10,28.96";
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const CACHE_KEY = "accessible-map:osm-places:v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements?: OverpassElement[] };

type CachedPlaces = {
  fetchedAt: number;
  places: MapPlace[];
};

const ACCESSIBILITY_KEYS: AccessibilityFeature[] = [
  "rampa",
  "intrareFaraTrepte",
  "lift",
  "toaletaAccesibila",
  "parcareAccesibila",
  "pavajTactil",
  "semnalAudio",
];

const unknownAccess = (): Record<AccessibilityFeature, AccessibilityValue> =>
  Object.fromEntries(
    ACCESSIBILITY_KEYS.map((key) => [key, "necunoscut"]),
  ) as Record<AccessibilityFeature, AccessibilityValue>;

const valueFromTag = (value: string | undefined): AccessibilityValue => {
  if (value === "yes" || value === "designated") return "da";
  if (value === "no") return "nu";
  return "necunoscut";
};

function accessibilityFromTags(tags: Record<string, string>) {
  const accessibility = unknownAccess();
  const wheelchair = tags.wheelchair;
  accessibility.rampa = valueFromTag(wheelchair);
  accessibility.intrareFaraTrepte = valueFromTag(wheelchair);
  accessibility.lift = valueFromTag(tags["elevator:wheelchair"]);
  accessibility.toaletaAccesibila = valueFromTag(tags["toilets:wheelchair"]);
  accessibility.parcareAccesibila =
    tags["capacity:disabled"] && Number(tags["capacity:disabled"]) > 0
      ? "da"
      : valueFromTag(tags["parking:disabled"]);
  accessibility.pavajTactil = valueFromTag(tags.tactile_paving);
  accessibility.semnalAudio = valueFromTag(
    tags["crossing:sound"] ?? tags["traffic_signals:sound"],
  );
  return accessibility;
}

function categoryFor(tags: Record<string, string>) {
  const category =
    tags.amenity ?? tags.shop ?? tags.tourism ?? tags.leisure ?? tags.historic;
  if (tags.aeroway === "aerodrome") return "Aeroport";
  if (["hospital", "clinic", "doctors", "dentist"].includes(category ?? ""))
    return "Spital";
  if (category === "pharmacy") return "Farmacie";
  if (
    [
      "library",
      "townhall",
      "courthouse",
      "police",
      "fire_station",
      "post_office",
      "bank",
      "government",
    ].includes(category ?? "")
  )
    return "Instituție publică";
  if (["school", "kindergarten", "college"].includes(category ?? ""))
    return "Școală";
  if (category === "university") return "Universitate";
  if (["restaurant", "cafe", "fast_food", "food_court"].includes(category ?? ""))
    return "Restaurant";
  if (["mall", "department_store"].includes(category ?? ""))
    return "Centru comercial";
  if (["supermarket", "convenience", "bakery", "clothes", "books"].includes(category ?? ""))
    return "Magazin";
  if (category === "museum") return "Muzeu";
  if (category === "hotel") return "Hotel";
  if (["park", "garden", "nature_reserve", "recreation_ground"].includes(category ?? ""))
    return "Parc";
  if (["bus_station", "train_station", "bus_stop", "taxi"].includes(category ?? ""))
    return "Transport";
  if (tags.historic) return "Clădire istorică";
  return "Altă locație";
}

function addressFor(tags: Record<string, string>) {
  const street = [tags["addr:street"], tags["addr:housenumber"]]
    .filter(Boolean)
    .join(" ");
  return [street, tags["addr:suburb"] ?? tags["addr:district"], "Chișinău"]
    .filter(Boolean)
    .join(", ");
}

function nameFor(tags: Record<string, string>) {
  const name = tags.name.trim();
  return /istanbul\s+pedestrian/i.test(name)
    ? "Pasaj pietonal subteran"
    : name;
}

function noteFor(tags: Record<string, string>) {
  const details = [
    tags.opening_hours ? `Program: ${tags.opening_hours}.` : "",
    tags.phone ? `Telefon: ${tags.phone}.` : "",
    tags.website ? `Site: ${tags.website}.` : "",
    tags.wheelchair === "yes"
      ? "Acces pentru scaun rulant indicat în OpenStreetMap."
      : tags.wheelchair === "no"
        ? "Accesul pentru scaun rulant este marcat ca indisponibil în OpenStreetMap."
        : "",
  ].filter(Boolean);
  return details.length
    ? details.join(" ")
    : "Locație importată din OpenStreetMap. Detaliile de accesibilitate se completează doar când există o informație publică verificabilă.";
}

function toMapPlace(element: OverpassElement): MapPlace | null {
  const tags = element.tags ?? {};
  const position: MapPlace["position"] | null =
    element.lat !== undefined && element.lon !== undefined
      ? [element.lat, element.lon]
      : element.center
        ? [element.center.lat, element.center.lon]
        : null;
  if (!position || !tags.name) return null;
  const category = categoryFor(tags);
  const categoryColor =
    placeCategories.find((item) => item.label === category)?.color ?? "#667085";
  const now = new Date().toISOString();
  return {
    id: `osm-${element.type}-${element.id}`,
    name: nameFor(tags),
    address: addressFor(tags),
    position,
    note: noteFor(tags),
    category,
    categoryColor,
    phone: tags.phone,
    website: tags.website,
    openingHours: tags.opening_hours,
    accessibility: accessibilityFromTags(tags),
    status: "necunoscut",
    source: "OSM",
    verified: false,
    createdAt: now,
    updatedAt: now,
  };
}

function readCache(): MapPlace[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedPlaces;
    if (
      !cached.fetchedAt ||
      Date.now() - cached.fetchedAt > CACHE_TTL_MS ||
      !Array.isArray(cached.places)
    )
      return null;
    return cached.places;
  } catch {
    return null;
  }
}

async function fetchOsmPlaces(signal?: AbortSignal) {
  const query = `[out:json][timeout:30];(
    nwr["name"]["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|library|townhall|courthouse|police|fire_station|post_office|bank|government|school|kindergarten|college|university|restaurant|cafe|fast_food|food_court|bus_station|train_station|bus_stop|taxi)$"](${CHISINAU_BBOX});
    nwr["name"]["shop"~"^(mall|department_store|supermarket|convenience|bakery|clothes|books)$"](${CHISINAU_BBOX});
    nwr["name"]["tourism"~"^(museum|hotel)$"](${CHISINAU_BBOX});
    nwr["name"]["leisure"~"^(park|garden|nature_reserve|recreation_ground)$"](${CHISINAU_BBOX});
    nwr["name"]["historic"](${CHISINAU_BBOX});
    nwr["name"]["aeroway"="aerodrome"](${CHISINAU_BBOX});
  );out center tags;`;
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(35_000)])
    : AbortSignal.timeout(35_000);
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
    signal: requestSignal,
  });
  if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
  const payload = (await response.json()) as OverpassResponse;
  return (payload.elements ?? [])
    .map(toMapPlace)
    .filter((place): place is MapPlace => place !== null)
    .slice(0, 500);
}

export async function discoverOsmPlaces(signal?: AbortSignal) {
  const cached = readCache();
  if (cached) return cached;
  const places = await fetchOsmPlaces(signal);
  try {
    const value: CachedPlaces = { fetchedAt: Date.now(), places };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // A full cache is not fatal; the current response is still usable.
  }
  return places;
}
