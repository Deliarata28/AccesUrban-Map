import type { LocationOption } from "../features/Map/LocationSearch";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
};

type NominatimReverseResult = NominatimResult & {
  address?: Record<string, string | undefined>;
  namedetails?: Record<string, string | undefined>;
};

const translatedName = (value: string) =>
  value.replace(/istanbul\s+pedestrian/gi, "Pasaj pietonal subteran");

const reverseResultName = (result: NominatimReverseResult) => {
  const address = result.address ?? {};
  const road = address.road ?? address.pedestrian ?? address.footway;
  const place =
    result.namedetails?.["name:ro"] ??
    result.name ??
    address.amenity ??
    address.shop ??
    address.tourism ??
    address.office ??
    address.building;
  const houseNumber = address.house_number;

  if (place) return place;
  if (road && houseNumber) return `${road} ${houseNumber}`;
  if (road) return road;
  return result.display_name.split(",")[0] || "Punct selectat pe hartă";
};

export async function searchMapLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationOption[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    addressdetails: "1",
    limit: "8",
    countrycodes: "md",
    viewbox: "28.74,47.10,28.96,46.94",
    bounded: "1",
  });
  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, {
    headers: { Accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  const results = (await response.json()) as NominatimResult[];
  return results.map((result) => ({
    label: /istanbul\s+pedestrian/i.test(result.name ?? result.display_name)
      ? "Pasaj pietonal subteran"
      : result.name || result.display_name.split(",")[0],
    detail: result.display_name.replace(
      /istanbul\s+pedestrian/gi,
      "Pasaj pietonal subteran",
    ),
    position: [Number(result.lat), Number(result.lon)],
    externalId: `nominatim-${result.place_id}`,
  }));
}

export async function reverseGeocodeMapPosition(
  position: [number, number],
  signal?: AbortSignal,
): Promise<LocationOption> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(position[0]),
    lon: String(position[1]),
    zoom: "18",
    addressdetails: "1",
    namedetails: "1",
    extratags: "1",
    "accept-language": "ro",
  });
  const response = await fetch(`${NOMINATIM_REVERSE_ENDPOINT}?${params}`, {
    headers: { Accept: "application/json" },
    signal: signal ?? AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);

  const result = (await response.json()) as NominatimReverseResult;
  const label = translatedName(reverseResultName(result));
  return {
    label,
    detail: translatedName(result.display_name || label),
    position,
    externalId: `nominatim-${result.place_id}`,
  };
}
