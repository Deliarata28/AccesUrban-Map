import type { AccessibilityPoint } from "../services/osmAccessibility";
import { requireMockAdmin } from "./authStore";
import { readCollection, writeCollection } from "./mockStorage";

const KEY = "accessible-map:obstacle-overrides:v1";

export type ObstacleOverride = AccessibilityPoint & {
  updatedAt: string;
};

export function getObstacleOverrides() {
  return readCollection<ObstacleOverride>(KEY, []);
}

export function applyObstacleOverrides(points: AccessibilityPoint[]) {
  const overrides = new Map(
    getObstacleOverrides().map((point) => [point.id, point]),
  );
  return points.map((point) => {
    const override = overrides.get(point.id);
    if (!override) return point;
    const { updatedAt: _updatedAt, ...details } = override;
    return { ...point, ...details, position: point.position };
  });
}

export function saveObstacleOverride(point: AccessibilityPoint) {
  requireMockAdmin();
  const overrides = getObstacleOverrides();
  const updated: ObstacleOverride = {
    ...point,
    notes: point.notes.map((note) => note.trim()).filter(Boolean),
    updatedAt: new Date().toISOString(),
  };
  writeCollection(
    KEY,
    overrides.some((item) => item.id === point.id)
      ? overrides.map((item) => (item.id === point.id ? updated : item))
      : [...overrides, updated],
  );
  return updated;
}
