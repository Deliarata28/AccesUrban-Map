import type { Position } from "../types/place";
import { applyObstacleOverrides } from "../stores/obstacleStore";

export type AccessibilityPointStatus = "good" | "limited" | "problem" | "unknown";

export type AccessibilityPoint = {
  id: string;
  position: Position;
  kind: string;
  osmType: string;
  streetName: string;
  score: number | null;
  status: AccessibilityPointStatus;
  surface: string;
  kerb: string;
  tactilePaving: string;
  wheelchair: string;
  width: string;
  incline?: string;
  ramp?: string;
  photoUrl?: string | null;
  notes: string[];
};

export type RouteRoadName = {
  name: string;
  position: Position;
};

type Element = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
};

const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const ACCESSIBILITY_CACHE_TTL = 5 * 60 * 1000;
// Obstacolele sunt căutate lângă fiecare segment al rutei, de la plecare până la destinație.
// Coridorul include trotuarul și trecerile paralele cu drumul, nu doar linia geometrică exactă.
export const ROUTE_OBSTACLE_CORRIDOR_METERS = 12;
let accessibilitySnapshot:
  | { fetchedAt: number; bounds: string; elements: Element[] }
  | null = null;

const routeQueryBounds = (route: Position[]) => {
  const latitudes = route.map(([latitude]) => latitude);
  const longitudes = route.map(([, longitude]) => longitude);
  const padding = 0.0018;
  return [
    Math.min(...latitudes) - padding,
    Math.min(...longitudes) - padding,
    Math.max(...latitudes) + padding,
    Math.max(...longitudes) + padding,
  ]
    .map((value) => value.toFixed(5))
    .join(",");
};

const label = (value: string | undefined, labels: Record<string, string>) =>
  value ? labels[value] ?? value.replace(/_/g, " ") : "";

const surfaceLabels: Record<string, string> = {
  asphalt: "Asfalt",
  concrete: "Beton",
  concrete_plates: "Plăci de beton",
  paving_stones: "Dale de pavaj",
  compacted: "Pietriș compactat",
  fine_gravel: "Pietriș fin",
  sett: "Piatra cubică",
  gravel: "Pietriș",
  ground: "Pământ",
  dirt: "Pământ",
  grass: "Iarbă",
  unpaved: "Nefinisat",
};

const barrierLabels: Record<string, string> = {
  bollard: "stâlp de blocare",
  cycle_barrier: "barieră în zig-zag",
  gate: "poartă",
  lift_gate: "barieră mobilă",
  fence: "gard",
  kerb: "bordură",
  block: "bloc de beton",
  chain: "lanț",
  turnstile: "turnichet",
};

const smoothnessLabels: Record<string, string> = {
  bad: "denivelată",
  very_bad: "foarte denivelată",
  horrible: "foarte dificilă",
  very_horrible: "extrem de dificilă",
  impassable: "impracticabilă",
};

const trafficCalmingLabels: Record<string, string> = {
  bump: "limitator de viteză",
  hump: "prag rutier",
  table: "platformă ridicată",
  cushion: "pernă de încetinire",
  rumble_strip: "benzi rezonatoare",
};

const elementPosition = (element: Element): Position | null =>
  element.lat !== undefined && element.lon !== undefined
    ? [element.lat, element.lon]
    : element.center
      ? [element.center.lat, element.center.lon]
      : element.geometry?.length
        ? (() => {
            const point = element.geometry[Math.floor(element.geometry.length / 2)];
            return [point.lat, point.lon] as Position;
          })()
        : null;

const distanceBetween = (a: Position, b: Position) => {
  const latitudeScale = Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * 111_320, (a[1] - b[1]) * 111_320 * latitudeScale);
};

function nearestStreetName(
  element: Element,
  namedRoads: Element[],
  routeRoads: RouteRoadName[],
  matchedPosition?: Position,
) {
  const position = matchedPosition ?? elementPosition(element);
  if (!position) return undefined;
  let closest: { name: string; distance: number } | undefined;
  namedRoads.forEach((road) => {
    const name = road.tags?.name?.trim();
    if (!name) return;
    const roadPositions = road.geometry?.map((point) => [point.lat, point.lon] as Position);
    const distance = roadPositions?.length
      ? Math.min(...roadPositions.map((roadPosition) => distanceBetween(position, roadPosition)))
      : (() => {
          const roadPosition = elementPosition(road);
          return roadPosition ? distanceBetween(position, roadPosition) : Number.POSITIVE_INFINITY;
        })();
    if (!closest || distance < closest.distance) closest = { name, distance };
  });
  routeRoads.forEach((road) => {
    const distance = distanceBetween(position, road.position);
    if (!closest || distance < closest.distance) closest = { name: road.name, distance };
  });
  return closest && closest.distance <= 120 ? closest.name : undefined;
}

function isNearRoute(point: AccessibilityPoint, route: Position[]) {
  const metersPerDegree = 111_320;
  const latitudeScale = Math.cos((point.position[0] * Math.PI) / 180);
  const distanceToSegment = (a: Position, b: Position) => {
    const ax = a[1] * latitudeScale;
    const ay = a[0];
    const bx = b[1] * latitudeScale;
    const by = b[0];
    const px = point.position[1] * latitudeScale;
    const py = point.position[0];
    const dx = bx - ax;
    const dy = by - ay;
    const denominator = dx * dx + dy * dy;
    const ratio = denominator ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator)) : 0;
    return Math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy)) * metersPerDegree;
  };
  return route
    .slice(1)
    .some(
      (pointB, index) =>
        distanceToSegment(route[index], pointB) <= ROUTE_OBSTACLE_CORRIDOR_METERS,
    );
}

function distanceAlongRoute(point: AccessibilityPoint, route: Position[]) {
  const metersPerDegree = 111_320;
  const latitudeScale = Math.cos((point.position[0] * Math.PI) / 180);
  let travelled = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestProgress = 0;

  route.slice(1).forEach((pointB, index) => {
    const pointA = route[index];
    const ax = pointA[1] * latitudeScale;
    const ay = pointA[0];
    const bx = pointB[1] * latitudeScale;
    const by = pointB[0];
    const px = point.position[1] * latitudeScale;
    const py = point.position[0];
    const dx = bx - ax;
    const dy = by - ay;
    const denominator = dx * dx + dy * dy;
    const ratio = denominator
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator))
      : 0;
    const projectedX = ax + ratio * dx;
    const projectedY = ay + ratio * dy;
    const distance = Math.hypot(px - projectedX, py - projectedY) * metersPerDegree;
    const segmentLength = Math.hypot(dx, dy) * metersPerDegree;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestProgress = travelled + segmentLength * ratio;
    }
    travelled += segmentLength;
  });

  return closestProgress;
}

function elementPositionOnRoute(element: Element, route: Position[]) {
  if (!element.geometry?.length) return elementPosition(element);
  return element.geometry
    .map((point) => [point.lat, point.lon] as Position)
    .reduce((closest, candidate) => {
      const candidateDistance = Math.min(
        ...route.map((routePoint) => distanceBetween(candidate, routePoint)),
      );
      const closestDistance = Math.min(
        ...route.map((routePoint) => distanceBetween(closest, routePoint)),
      );
      return candidateDistance < closestDistance ? candidate : closest;
    });
}

function toAccessibilityPoint(
  element: Element,
  namedRoads: Element[],
  routeRoads: RouteRoadName[],
  route: Position[],
): AccessibilityPoint | null {
  const tags = element.tags ?? {};
  const position = elementPositionOnRoute(element, route);
  if (!position) return null;
  const streetName =
    tags["addr:street"] ??
    nearestStreetName(element, namedRoads, routeRoads, position) ??
    tags.name ??
    tags.ref;
  const accessibilityTags = [
    tags.surface,
    tags.smoothness,
    tags.kerb,
    tags.tactile_paving,
    tags.wheelchair,
    tags.width,
    tags.incline,
    tags.ramp,
    tags["ramp:wheelchair"],
    tags.barrier,
    tags.construction,
    tags.access,
    tags.traffic_calming,
  ].filter(Boolean);
  const widthNumber = tags.width ? Number.parseFloat(tags.width) : NaN;
  const roughSurface = ["gravel", "ground", "unpaved", "sett", "dirt", "grass"].includes(tags.surface ?? "");
  const difficultSmoothness = ["bad", "very_bad", "horrible", "very_horrible", "impassable"].includes(tags.smoothness ?? "");
  const narrowPassage = Number.isFinite(widthNumber) && widthNumber < 1.2;
  const inclineNumber = tags.incline
    ? Number.parseFloat(tags.incline.replace("%", ""))
    : NaN;
  const steepIncline =
    (Number.isFinite(inclineNumber) && Math.abs(inclineNumber) > 6) ||
    ["up", "down", "steep"].includes(tags.incline ?? "");
  const rampValue = tags["ramp:wheelchair"] ?? tags.ramp;
  const ramp = label(rampValue, {
    yes: "Rampă disponibilă",
    no: "Fără rampă pentru scaun rulant",
  });
  const rampUnavailable = rampValue === "no";
  const obstacleTag =
    tags.barrier ||
    tags.construction ||
    tags.traffic_calming ||
    tags.highway === "steps" ||
    tags.kerb === "raised" ||
    tags.wheelchair === "no" ||
    tags.wheelchair === "limited" ||
    tags.access === "no" ||
    tags.access === "private" ||
    rampUnavailable ||
    steepIncline ||
    roughSurface ||
    difficultSmoothness ||
    narrowPassage;
  if (!streetName || (accessibilityTags.length === 0 && !obstacleTag)) return null;

  const highway = tags.highway;
  const kind = tags.construction || highway === "construction"
      ? "Lucrări pe traseu"
      : highway === "steps"
        ? "Scări"
        : tags.kerb === "raised" || tags.barrier === "kerb"
          ? "Bordură înaltă"
          : roughSurface || difficultSmoothness
            ? "Suprafață dificilă"
            : narrowPassage
              ? "Trecere îngustă"
              : steepIncline
                ? "Pantă abruptă"
                : tags.wheelchair === "no" || tags.access === "no" || tags.access === "private"
                  ? "Acces restricționat"
                  : tags.traffic_calming
                    ? "Denivelare pe traseu"
                    : tags.barrier === "bollard"
                      ? "Stâlp de blocare"
                      : tags.barrier === "cycle_barrier"
                        ? "Barieră în zig-zag"
                        : tags.barrier === "gate" || tags.barrier === "lift_gate"
                          ? "Poartă pe traseu"
                          : "Barieră fizică";
  const osmType =
    tags.highway ??
    tags.barrier ??
    tags.construction ??
    tags.traffic_calming ??
    "accessibility-element";
  const surface = label(tags.surface, surfaceLabels);
  const kerb = label(tags.kerb, {
    lowered: "Coborâtă",
    flush: "La nivel",
    raised: "Înaltă",
  });
  const tactilePaving = label(tags.tactile_paving, { yes: "Da", no: "Nu" });
  const wheelchair = label(tags.wheelchair, { yes: "Da", no: "Nu", limited: "Limitat" });
  const width = Number.isFinite(widthNumber)
    ? `${widthNumber.toFixed(1)} m`
    : "";
  const incline = tags.incline?.trim() ?? "";
  let score = 100;
  const notes: string[] = [];
  if (tags.barrier) {
    notes.push(
      `Pe traseu este marcat ${barrierLabels[tags.barrier] ?? "un obstacol fizic"}.`,
    );
    score -= 30;
  }
  if (tags.construction || highway === "construction") {
    notes.push("Lucrări marcate în datele OpenStreetMap.");
    score -= 40;
  }
  if (tags.traffic_calming) {
    notes.push(
      `Pe suprafață este marcat ${trafficCalmingLabels[tags.traffic_calming] ?? "un element de încetinire"}.`,
    );
    score -= 20;
  }
  if (highway === "steps") {
    score -= 50;
    notes.push("Include trepte.");
  }
  if (["gravel", "ground", "unpaved", "sett", "dirt", "grass"].includes(tags.surface)) {
    score -= 15;
    notes.push(`Suprafață dificilă pentru deplasare: ${surface.toLowerCase()}.`);
  }
  if (tags.kerb === "raised") {
    score -= 25;
    notes.push("Bordură înaltă.");
  }
  if (tags.wheelchair === "no") {
    score -= 35;
    notes.push("Acces marcat ca indisponibil pentru scaun rulant.");
  }
  if (Number.isFinite(widthNumber) && widthNumber < 1.2) {
    score -= 15;
    notes.push("Trecere îngustă.");
  }
  if (["bad", "very_bad", "horrible", "very_horrible", "impassable"].includes(tags.smoothness ?? "")) {
    notes.push(
      `Suprafața este marcată ca ${smoothnessLabels[tags.smoothness!] ?? "dificilă"}.`,
    );
    score -= 20;
  }
  if (tags.access === "no" || tags.access === "private") {
    notes.push(
      tags.access === "private"
        ? "Accesul este marcat ca privat."
        : "Accesul public este marcat ca interzis.",
    );
    score -= 30;
  }
  if (tags.wheelchair === "limited") {
    notes.push("Accesul pentru scaun rulant este marcat ca limitat.");
    score -= 15;
  }
  if (rampUnavailable) {
    notes.push("Nu este marcată o rampă utilizabilă pentru scaun rulant.");
    score -= 30;
  } else if (rampValue === "yes") {
    notes.push("Este marcată o rampă pentru scaun rulant.");
  }
  if (steepIncline) {
    notes.push(
      Number.isFinite(inclineNumber)
        ? `Pantă marcată cu o înclinare de ${Math.abs(inclineNumber)}%.`
        : "Segment marcat cu pantă abruptă.",
    );
    score -= 20;
  }
  if (!notes.length) return null;
  const safeScore = Math.max(0, score);
  const knownScore = accessibilityTags.length >= 1 || obstacleTag ? safeScore : null;
  return {
    id: `accessibility-${element.type}-${element.id}`,
    position: position as Position,
    kind,
    osmType,
    streetName,
    score: knownScore,
    status: knownScore === null
      ? "unknown"
      : knownScore >= 90
        ? "good"
        : knownScore >= 70
          ? "limited"
          : "problem",
    surface,
    kerb,
    tactilePaving,
    wheelchair,
    width,
    incline,
    ramp,
    notes,
  };
}

export async function getRouteAccessibility(
  route: Position[],
  signal?: AbortSignal,
  routeRoads: RouteRoadName[] = [],
): Promise<AccessibilityPoint[]> {
  if (route.length < 2) return [];
  const bounds = routeQueryBounds(route);
  const query = `[out:json][timeout:25];(
    nwr["highway"="steps"](${bounds});
    nwr["highway"="construction"](${bounds});
    nwr["barrier"~"^(bollard|cycle_barrier|gate|lift_gate|fence|block|chain|turnstile)$"](${bounds});
    nwr["barrier"="kerb"]["kerb"="raised"](${bounds});
    nwr["highway"="crossing"]["kerb"="raised"](${bounds});
    nwr["traffic_calming"~"^(bump|hump|table|cushion|rumble_strip)$"](${bounds});
    nwr["highway"~"^(footway|path|pedestrian|steps)$"]["wheelchair"~"^(no|limited)$"](${bounds});
    nwr["highway"~"^(footway|path|pedestrian|steps)$"]["access"~"^(no|private)$"](${bounds});
    nwr["highway"~"^(footway|path|pedestrian)$"]["surface"~"^(gravel|ground|unpaved|sett|dirt|grass)$"](${bounds});
    nwr["highway"~"^(footway|path|pedestrian)$"]["smoothness"~"^(bad|very_bad|horrible|very_horrible|impassable)$"](${bounds});
    nwr["highway"~"^(footway|path|pedestrian)$"]["width"](${bounds});
    nwr["highway"~"^(footway|path|pedestrian)$"]["incline"](${bounds});
    nwr["ramp:wheelchair"="no"](${bounds});
    nwr["ramp"="no"](${bounds});
  );out geom tags;`;
  const accessibilityQuery = query;
  const buildPoints = (elements: Element[]) => {
    const namedRoads = elements.filter(
      (element) => element.type === "way" && !!element.tags?.highway && !!element.tags?.name,
    );
    const points = elements
      .map((element) =>
        toAccessibilityPoint(element, namedRoads, routeRoads, route),
      )
      .filter((point): point is AccessibilityPoint => point !== null)
      .filter((point) => isNearRoute(point, route))
      .filter((point) => point.status !== "good")
      .sort((a, b) => distanceAlongRoute(a, route) - distanceAlongRoute(b, route));
    const distinctPoints = points.filter(
      (point, index) =>
        !points.slice(0, index).some(
          (previous) =>
            previous.kind === point.kind &&
            distanceBetween(previous.position, point.position) < 18,
        ),
    );
    return applyObstacleOverrides(distinctPoints);
  };
  if (
    accessibilitySnapshot &&
    accessibilitySnapshot.bounds === bounds &&
    Date.now() - accessibilitySnapshot.fetchedAt < ACCESSIBILITY_CACHE_TTL
  ) {
    return buildPoints(accessibilitySnapshot.elements);
  }
  let lastError = "Datele de accesibilitate nu sunt disponibile.";
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ data: accessibilityQuery }),
        signal: signal ?? AbortSignal.timeout(22_000),
      });
      if (!response.ok) {
        lastError = `Serviciul OpenStreetMap a răspuns cu ${response.status}.`;
        continue;
      }
      const payload = (await response.json()) as { elements?: Element[] };
      const elements = Array.from(
        new Map(
          (payload.elements ?? []).map((element) => [`${element.type}-${element.id}`, element]),
        ).values(),
      );
      accessibilitySnapshot = { fetchedAt: Date.now(), bounds, elements };
      return buildPoints(elements);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}
