export type AccessibilityStatus =
  "accesibil" | "partial" | "redus" | "necunoscut";
export type AccessibilityValue = "da" | "nu" | "necunoscut";
export type AccessibilityFeature =
  | "rampa"
  | "intrareFaraTrepte"
  | "lift"
  | "toaletaAccesibila"
  | "parcareAccesibila"
  | "pavajTactil"
  | "semnalAudio";
/** Latitude, longitude. Convert to [longitude, latitude] at the MapLibre boundary. */
export type Position = [number, number];
export type PlaceSource =
  "MOCK" | "MANUAL" | "OSM" | "FIELD_SURVEY" | "PUBLIC_DATA";
export type MapPlace = {
  id: string;
  name: string;
  address: string;
  position: Position;
  note: string;
  category: string;
  categoryColor: string;
  aliases?: string[];
  phone?: string;
  website?: string;
  openingHours?: string;
  accessibility: Record<AccessibilityFeature, AccessibilityValue>;
  status: AccessibilityStatus;
  source: PlaceSource;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PlaceInput = Omit<
  MapPlace,
  "id" | "status" | "categoryColor" | "createdAt" | "updatedAt"
>;
