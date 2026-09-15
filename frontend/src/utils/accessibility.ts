import { accessibilityFeatures } from "../config/accessibility";
import type {
  AccessibilityFeature,
  AccessibilityStatus,
  AccessibilityValue,
  MapPlace,
} from "../types/place";

export function evaluateAccessibility(
  features: Record<AccessibilityFeature, AccessibilityValue>,
) {
  const known = accessibilityFeatures.filter(
    ({ key }) => features[key] !== "necunoscut",
  ).length;
  const score = accessibilityFeatures.reduce(
    (sum, { key, points }) => sum + (features[key] === "da" ? points : 0),
    0,
  );
  const hasConfirmedBarrier = accessibilityFeatures.some(
    ({ key }) => features[key] === "nu",
  );
  const hasConfirmedAccess = accessibilityFeatures.some(
    ({ key }) => features[key] === "da",
  );
  const status: AccessibilityStatus =
    known === 0
      ? "necunoscut"
      : score >= 80
        ? "accesibil"
        : score >= 50
          ? "partial"
          : hasConfirmedBarrier
            ? "redus"
            : hasConfirmedAccess
              ? "partial"
              : "necunoscut";
  return { score, status, known, total: accessibilityFeatures.length };
}
export function scoreFor(place: Pick<MapPlace, "accessibility">) {
  return evaluateAccessibility(place.accessibility).score;
}
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export type PlaceFilters = {
  search?: string;
  category?: string;
  status?: string;
  facilities?: AccessibilityFeature[];
  minScore?: number;
  verifiedOnly?: boolean;
};
export function filterPlaces(places: MapPlace[], filters: PlaceFilters) {
  const query = normalizeSearch(filters.search ?? "");
  return places.filter((place) => {
    const assessment = evaluateAccessibility(place.accessibility);
    return (
      (!query ||
        normalizeSearch(
          [place.name, place.address, ...(place.aliases ?? [])].join(" "),
        ).includes(query)) &&
      (!filters.category || place.category === filters.category) &&
      (!filters.status || assessment.status === filters.status) &&
      (!filters.minScore ||
        (assessment.known > 0 && assessment.score >= filters.minScore)) &&
      (!filters.verifiedOnly || place.verified) &&
      (filters.facilities ?? []).every(
        (key) => place.accessibility[key] === "da",
      )
    );
  });
}
