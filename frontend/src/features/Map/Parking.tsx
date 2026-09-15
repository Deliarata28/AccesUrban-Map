import type { Position } from "../../types/place";

export type ParkingLocation = {
  id: string;
  name: string;
  address: string;
  position: Position;
  access: "publică" | "clienți";
  accessible: boolean | null;
  note: string;
};

export const parkingLocations: ParkingLocation[] = [
  {
    id: "parcare-publica-ismail-27",
    name: "Parcare publică Ismail 27",
    address: "Strada Ismail 27, Chișinău",
    position: [47.0152578, 28.8435781],
    access: "publică",
    accessible: null,
    note: "Parcare publică. Disponibilitatea locurilor nu este transmisă live.",
  },
  {
    id: "parcare-malldova",
    name: "Parcare Shopping MallDova",
    address: "Strada Arborilor 21, Chișinău",
    position: [47.00487, 28.84121],
    access: "clienți",
    accessible: null,
    note: "Parcare asociată centrului comercial. Verifică regulile la intrare.",
  },
  {
    id: "parcare-jumbo",
    name: "Parcare Jumbo",
    address: "Bulevardul Decebal 23/1, Chișinău",
    position: [47.00418, 28.86016],
    access: "clienți",
    accessible: null,
    note: "Parcare asociată centrului comercial. Disponibilitatea nu este live.",
  },
  {
    id: "parcare-port-mall",
    name: "Parcare Port Mall",
    address: "Strada Mihail Sadoveanu 42/6, Chișinău",
    position: [47.07077, 28.88863],
    access: "clienți",
    accessible: true,
    note: "Parcare pentru vizitatorii Port Mall. Verifică locurile rezervate la fața locului.",
  },
  {
    id: "parcare-kaufland-kiev",
    name: "Parcare Kaufland Kiev",
    address: "Strada Kiev 7, Chișinău",
    position: [47.0428692, 28.8597431],
    access: "clienți",
    accessible: true,
    note: "Parcare aferentă magazinului. Se aplică regulile operatorului.",
  },
  {
    id: "parcare-kaufland-testemitanu",
    name: "Parcare Kaufland Testemițanu",
    address: "Strada Nicolae Testemițanu 3, Chișinău",
    position: [47.0008389, 28.840157],
    access: "clienți",
    accessible: true,
    note: "Parcare aferentă magazinului. Se aplică regulile operatorului.",
  },
  {
    id: "parcare-kaufland-decebal",
    name: "Parcare Kaufland Decebal",
    address: "Bulevardul Decebal 99/2, Chișinău",
    position: [46.9903731, 28.8603198],
    access: "clienți",
    accessible: true,
    note: "Parcare aferentă magazinului. Se aplică regulile operatorului.",
  },
  {
    id: "parcare-kaufland-mircea",
    name: "Parcare Kaufland Mircea cel Bătrân",
    address: "Bulevardul Mircea cel Bătrân 25/1, Chișinău",
    position: [47.0538645, 28.8895246],
    access: "clienți",
    accessible: true,
    note: "Parcare aferentă magazinului. Se aplică regulile operatorului.",
  },
  {
    id: "parcare-piata-centrala",
    name: "Parcare publică Piața Centrală",
    address: "Strada Armenească, adiacentă Pieței Centrale, Chișinău",
    position: [47.0186842, 28.8364964],
    access: "publică",
    accessible: null,
    note: "Parcare publică amenajată lângă Piața Centrală. Locurile accesibile nu sunt confirmate separat.",
  },
  {
    id: "parcare-dendrariu",
    name: "Parcare publică Dendrariu",
    address: "Strada Ion Creangă, lângă Parcul Dendrariu, Chișinău",
    position: [47.0255969, 28.8283759],
    access: "publică",
    accessible: null,
    note: "Parcare publică pentru vizitatorii parcului. Locurile accesibile nu sunt confirmate separat.",
  },
  {
    id: "parcare-ciocana",
    name: "Parcare publică Ciocana",
    address: "Bulevardul Mircea cel Bătrân 29/1, Chișinău",
    position: [47.0538749, 28.8876816],
    access: "publică",
    accessible: null,
    note: "Parcare publică amenajată în spatele magazinului Kaufland. Locurile accesibile nu sunt confirmate separat.",
  },
  {
    id: "parcare-calea-iesilor",
    name: "Parcare publică Calea Ieșilor",
    address: "Strada Calea Ieșilor 11/4, Chișinău",
    position: [47.0394752, 28.802167],
    access: "publică",
    accessible: null,
    note: "Parcare publică amenajată pentru comunitate și vizitatorii parcului Alunelul.",
  },
];

const CHISINAU_BBOX = "46.94,28.74,47.10,28.96";
const PARKING_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

type OverpassParkingElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const parkingPosition = (element: OverpassParkingElement): Position | null =>
  element.lat !== undefined && element.lon !== undefined
    ? [element.lat, element.lon]
    : element.center
      ? [element.center.lat, element.center.lon]
      : null;

const parkingAddress = (tags: Record<string, string>) =>
  [
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
    tags["addr:suburb"] ?? tags["addr:district"],
    "Chișinău",
  ]
    .filter(Boolean)
    .join(", ") || "Chișinău";

export async function discoverAccessibleParking(
  signal?: AbortSignal,
): Promise<ParkingLocation[]> {
  const query = `[out:json][timeout:25];(nwr["amenity"="parking"]["wheelchair"="yes"](${CHISINAU_BBOX});nwr["amenity"="parking"]["capacity:disabled"](${CHISINAU_BBOX});nwr["amenity"="parking"]["parking:disabled"](${CHISINAU_BBOX});nwr["amenity"="parking_space"]["wheelchair"="yes"](${CHISINAU_BBOX}););out center tags;`;
  let lastError: unknown;
  for (const endpoint of PARKING_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ data: query }),
        signal: signal ?? AbortSignal.timeout(30_000),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as {
        elements?: OverpassParkingElement[];
      };
      const unique = new Map<string, ParkingLocation>();
      for (const element of payload.elements ?? []) {
        const tags = element.tags ?? {};
        const position = parkingPosition(element);
        if (!position) continue;
        const accessibilityEvidence =
          tags.wheelchair === "yes"
            ? "acces pentru scaun rulant marcat ca disponibil"
            : tags["capacity:disabled"]
              ? `${tags["capacity:disabled"]} locuri rezervate pentru persoane cu dizabilități`
              : "parcare accesibilă marcată în OpenStreetMap";
        const id = `osm-parking-${element.type}-${element.id}`;
        unique.set(id, {
          id,
          name: tags.name?.trim() || "Parcare accesibilă documentată",
          address: parkingAddress(tags),
          position,
          access: tags.access === "private" ? "clienți" : "publică",
          accessible: true,
          note: `Date publice OpenStreetMap: ${accessibilityEvidence}. Disponibilitatea locurilor nu este transmisă live.`,
        });
      }
      return [...unique.values()];
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      lastError = error;
    }
  }
  if (lastError) return [];
  return [];
}
