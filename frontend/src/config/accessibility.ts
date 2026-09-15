import type {
  AccessibilityFeature,
  AccessibilityStatus,
  AccessibilityValue,
  PlaceSource,
} from "../types/place";

export const accessibilityFeatures: {
  key: AccessibilityFeature;
  label: string;
  points: number;
}[] = [
  { key: "rampa", label: "Rampă", points: 20 },
  { key: "intrareFaraTrepte", label: "Intrare fără trepte", points: 25 },
  { key: "lift", label: "Lift", points: 15 },
  { key: "toaletaAccesibila", label: "Toaletă accesibilă", points: 15 },
  { key: "parcareAccesibila", label: "Parcare accesibilă", points: 10 },
  { key: "pavajTactil", label: "Pavaj tactil", points: 10 },
  { key: "semnalAudio", label: "Semnal audio", points: 5 },
];
export const statusMeta: Record<
  AccessibilityStatus,
  { label: string; color: string }
> = {
  accesibil: { label: "Accesibil", color: "#16803c" },
  partial: { label: "Parțial accesibil", color: "#d97706" },
  redus: { label: "Accesibilitate redusă", color: "#c62828" },
  necunoscut: { label: "Necunoscut", color: "#667085" },
};
export const accessibilityValueLabel: Record<AccessibilityValue, string> = {
  da: "Da",
  nu: "Nu",
  necunoscut: "Necunoscut",
};
export const sourceLabels: Record<PlaceSource, string> = {
  MOCK: "Import local",
  MANUAL: "Adăugare manuală",
  OSM: "OpenStreetMap",
  FIELD_SURVEY: "Confirmare pe teren",
  PUBLIC_DATA: "Registru public",
};
export const placeCategories = [
  { label: "Spital", color: "#dc9690" },
  { label: "Farmacie", color: "#d58c9b" },
  { label: "Instituție publică", color: "#a3bd78" },
  { label: "Muzeu", color: "#64748b" },
  { label: "Catedrală", color: "#b45309" },
  { label: "Școală", color: "#d8b657" },
  { label: "Universitate", color: "#93a0d6" },
  { label: "Restaurant", color: "#dd9b7b" },
  { label: "Magazin", color: "#78b4b8" },
  { label: "Centru comercial", color: "#0891b2" },
  { label: "Hotel", color: "#aa91ca" },
  { label: "Parc", color: "#84ae8c" },
  { label: "Transport", color: "#7aa9c9" },
  { label: "Aeroport", color: "#0369a1" },
  { label: "Clădire istorică", color: "#7c3aed" },
  { label: "Altă locație", color: "#9caab2" },
];
