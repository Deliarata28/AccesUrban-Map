import type { AccessibilityProfile } from "../../stores/sessionStore";
import type { Position } from "../../types/place";

export type TravelMode = "foot" | "driving";

export const travelModeLabels: Record<TravelMode, string> = {
  foot: "Pe jos",
  driving: "Cu mașina",
};

export type RouteSegment = {
  distance: number;
  stairs: boolean | null;
  wheelchairAccess: "yes" | "no" | "unknown";
  incline: number | null;
  surface: "smooth" | "rough" | "unknown";
  width: number | null;
  kerb: number | null;
  instruction?: string;
  instructionKind?: RouteGuidanceKind;
  position?: Position;
  roadName?: string;
  fromRoadName?: string;
  symbol?: string;
};

export type RouteCandidate = {
  id: string;
  name: string;
  coordinates: Position[];
  segments: RouteSegment[];
  duration?: number;
  mode?: TravelMode;
};

export type EvaluatedRoute = RouteCandidate & {
  distance: number;
  duration: number;
  penalty: number;
  cost: number;
  score: number | null;
  blocked: boolean;
  reasons: string[];
  unknownSegments: number;
  maxIncline: number | null;
  roughDistance: number;
};

export type RouteGuidanceKind =
  | "start"
  | "turn"
  | "continue"
  | "arrival";

export type RouteGuidanceSeverity = "info";

export type RouteGuidanceItem = {
  id: string;
  kind: RouteGuidanceKind;
  severity: RouteGuidanceSeverity;
  position: Position;
  symbol: string;
  title: string;
  detail: string;
  sequence: number;
};

export const profileLabels: Record<AccessibilityProfile, string> = {
  WHEELCHAIR: "Scaun rulant",
  WALKING_AID: "Dispozitiv de mers",
  VISUAL_IMPAIRMENT: "Deficiență de vedere",
};

const profileSpeedsMetersPerSecond: Record<AccessibilityProfile, number> = {
  WHEELCHAIR: 0.9,
  WALKING_AID: 0.75,
  VISUAL_IMPAIRMENT: 0.95,
};

const estimateWalkingDuration = (
  segments: RouteSegment[],
  profile: AccessibilityProfile,
) => {
  const speed = profileSpeedsMetersPerSecond[profile];
  const seconds = segments.reduce((total, segment) => {
    let slowdown = 1;
    if (segment.surface === "rough") slowdown += 0.2;
    if (segment.incline !== null && Math.abs(segment.incline) > 6) slowdown += 0.2;
    if (segment.width !== null && segment.width < 1.2) slowdown += 0.1;
    if (segment.kerb !== null && segment.kerb > 0) slowdown += 0.1;
    if (segment.stairs) slowdown += profile === "WALKING_AID" ? 0.35 : 0.15;
    if (
      segment.stairs === null ||
      segment.incline === null ||
      segment.width === null ||
      segment.kerb === null ||
      segment.surface === "unknown" ||
      segment.wheelchairAccess === "unknown"
    ) {
      slowdown += 0.08;
    }
    return total + (segment.distance / speed) * slowdown;
  }, 0);
  return Math.max(30, Math.round(seconds));
};

const estimateDrivingDuration = (distance: number, providerDuration?: number) =>
  providerDuration && providerDuration > 0
    ? providerDuration
    : Math.max(30, Math.round(distance / 8.33));

export function evaluateRoute(
  candidate: RouteCandidate,
  profile: AccessibilityProfile,
): EvaluatedRoute {
  if (
    !candidate.segments.length ||
    candidate.segments.some(
      (segment) =>
        !Number.isFinite(segment.distance) ||
        segment.distance <= 0 ||
        (segment.incline !== null && !Number.isFinite(segment.incline)) ||
        (segment.width !== null &&
          (!Number.isFinite(segment.width) || segment.width < 0)) ||
        (segment.kerb !== null &&
          (!Number.isFinite(segment.kerb) || segment.kerb < 0)),
    )
  ) {
    throw new Error("Date de traseu invalide.");
  }

  const reasons = new Set<string>();
  let penalty = 0;
  let blocked = false;
  let unknownSegments = 0;
  let roughDistance = 0;
  const driving = candidate.mode === "driving";

  for (const segment of candidate.segments) {
    if (driving) continue;
    if (
      profile === "WHEELCHAIR" &&
      (segment.stairs === true || segment.wheelchairAccess === "no")
    ) {
      blocked = true;
      reasons.add(
        segment.stairs
          ? "Traseu cu scări: exclus pentru scaun rulant."
          : "Un segment nu permite accesul cu scaun rulant.",
      );
    } else if (segment.stairs) {
      penalty += 1000;
      reasons.add("Traseul include scări.");
    }

    const weight = segment.distance / 100;
    if (segment.incline !== null && Math.abs(segment.incline) > 6) {
      penalty += (Math.abs(segment.incline) > 8 ? 500 : 200) * weight;
      reasons.add(`Pantă de până la ${Math.abs(segment.incline)}%.`);
    }
    if (segment.surface === "rough") {
      penalty += 100 * weight;
      roughDistance += segment.distance;
      reasons.add("Unele porțiuni au suprafața deteriorată.");
    }
    if (segment.width !== null && segment.width < 1.2) {
      penalty += 150 * weight;
      reasons.add("Trotuar mai îngust de 1,2 m.");
    }
    if (segment.kerb !== null && segment.kerb > 0) {
      penalty += 100 * weight;
      reasons.add("Traseul include borduri.");
    }
    if (
      segment.stairs === null ||
      segment.incline === null ||
      segment.width === null ||
      segment.kerb === null ||
      segment.surface === "unknown" ||
      segment.wheelchairAccess === "unknown"
    ) {
      unknownSegments++;
      penalty += 75 * weight;
    }
  }

  if (!driving && unknownSegments) {
    reasons.add("Accesibilitatea unor segmente nu este confirmată.");
  }
  if (profile === "VISUAL_IMPAIRMENT") {
    reasons.add("Datele despre pavaj tactil și semnale audio nu sunt evaluate.");
  }

  const distance = candidate.segments.reduce(
    (sum, segment) => sum + segment.distance,
    0,
  );
  const inclines = candidate.segments.flatMap((segment) =>
    segment.incline === null ? [] : [Math.abs(segment.incline)],
  );

  return {
    ...candidate,
    distance,
    duration: driving
      ? estimateDrivingDuration(distance, candidate.duration)
      : estimateWalkingDuration(candidate.segments, profile),
    penalty: Math.round(penalty),
    cost: blocked ? Infinity : Math.round(distance + penalty),
    score: driving
      ? null
      : unknownSegments === candidate.segments.length
        ? null
        : Math.max(0, Math.round(100 - (penalty / distance) * 20)),
    blocked,
    reasons: [...reasons],
    unknownSegments,
    maxIncline: inclines.length ? Math.max(...inclines) : null,
    roughDistance,
  };
}

export function recommendRoute(
  candidates: RouteCandidate[],
  profile: AccessibilityProfile,
) {
  const routes = candidates
    .map((candidate) => evaluateRoute(candidate, profile))
    .sort((a, b) => a.cost - b.cost || a.distance - b.distance);

  return {
    routes,
    recommendedId: routes.find((route) => !route.blocked)?.id ?? null,
  };
}

export function distanceBetween(a: Position, b: Position) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b[0] - a[0]) / 2) ** 2 +
    Math.cos(rad(a[0])) *
      Math.cos(rad(b[0])) *
      Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

type OsmManeuver = {
  type?: string;
  modifier?: string;
  location?: [number, number];
};

type OsmStep = {
  distance?: number;
  name?: string;
  ref?: string;
  destinations?: string;
  maneuver?: OsmManeuver;
};

type OsmRoute = {
  distance: number;
  duration: number;
  geometry?: { coordinates?: Array<[number, number]> };
  legs?: Array<{ steps?: OsmStep[] }>;
};

type OsmRouteResponse = {
  code?: string;
  message?: string;
  routes?: OsmRoute[];
};

type GraphHopperInstruction = {
  distance?: number;
  text?: string;
  street_name?: string;
  sign?: number;
  interval?: [number, number];
};

type GraphHopperPath = {
  distance?: number;
  time?: number;
  points?: { coordinates?: Array<[number, number, number?]> };
  instructions?: GraphHopperInstruction[];
  details?: Record<string, Array<[number, number, string | number | boolean]>>;
};

type GraphHopperResponse = {
  message?: string;
  paths?: GraphHopperPath[];
};

const osmRoutingUrls: Record<TravelMode, string> = {
  foot: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
  driving: "https://router.project-osrm.org/route/v1/driving",
};

const graphHopperApiKey = import.meta.env.VITE_GRAPHOPPER_API_KEY?.trim();

const unknownRouteSegment = (distance: number): RouteSegment => ({
  distance,
  stairs: null,
  wheelchairAccess: "unknown",
  incline: null,
  surface: "unknown",
  width: null,
  kerb: null,
});

const roadNameForStep = (step: OsmStep) =>
  step.name?.trim() || step.ref?.trim() || step.destinations?.trim() || undefined;

const normalizeRoadName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .replace(/\s+/g, " ")
    .trim();

const simplifyRoadTransition = (instruction: string) =>
  instruction.replace(/\s+de pe .+ pe (.+)$/i, " pe $1");

const stepInstruction = (
  step: OsmStep,
  roadName: string | undefined,
  index: number,
  total: number,
  mode: TravelMode,
) => {
  const type = step.maneuver?.type ?? "continue";
  const modifier = step.maneuver?.modifier ?? "straight";
  const roadContext = roadName ? ` pe ${roadName}` : "";

  if (type === "depart") {
    return {
      title: `Pornește${roadContext}`,
      kind: "start" as const,
      symbol: mode === "driving" ? "↗" : "↑",
    };
  }
  if (type === "arrive") {
    return {
      title: "Ai ajuns la destinație",
      kind: "arrival" as const,
      symbol: "●",
    };
  }
  if (type === "roundabout" || type === "rotary") {
    return {
      title: `Intră în sensul giratoriu${roadName ? ` spre ${roadName}` : roadContext}`,
      kind: "turn" as const,
      symbol: "↻",
    };
  }
  if (type === "uturn") {
    return {
      title: `Întoarce${roadContext}`,
      kind: "turn" as const,
      symbol: "↶",
    };
  }

  const directions: Record<string, { title: string; symbol: string }> = {
    left: { title: "Virează la stânga", symbol: "↰" },
    "slight left": { title: "Ține ușor spre stânga", symbol: "↖" },
    "sharp left": { title: "Virează strâns spre stânga", symbol: "↰" },
    right: { title: "Virează la dreapta", symbol: "↱" },
    "slight right": { title: "Ține ușor spre dreapta", symbol: "↗" },
    "sharp right": { title: "Virează strâns spre dreapta", symbol: "↱" },
    straight: { title: "Continuă înainte", symbol: "↑" },
  };
  const direction = directions[modifier] ?? directions.straight;
  return {
    title: `${direction.title}${roadContext}`,
    kind: index === total - 1 ? ("arrival" as const) : ("turn" as const),
    symbol: direction.symbol,
  };
};

const routeSegments = (route: OsmRoute, mode: TravelMode): RouteSegment[] => {
  const steps = (route.legs ?? [])
    .flatMap((leg) => leg.steps ?? [])
    .filter((step) => Number.isFinite(step.distance));

  if (!steps.length) {
    return [
      {
        ...unknownRouteSegment(route.distance),
        instruction: "Urmează traseul până la destinație",
        instructionKind: "continue",
        symbol: "↑",
      },
    ];
  }

  let previousRoadName: string | undefined;
  return steps.map((step, index) => {
    const roadName = roadNameForStep(step);
    const instruction = stepInstruction(
      step,
      roadName,
      index,
      steps.length,
      mode,
    );
    const fromRoadName = roadName ? undefined : previousRoadName;
    if (roadName) previousRoadName = roadName;
    const location = step.maneuver?.location;
    return {
      ...unknownRouteSegment(Math.max(1, step.distance ?? 0)),
      instruction: instruction.title,
      instructionKind: instruction.kind,
      symbol: instruction.symbol,
      roadName,
      fromRoadName,
      position: location ? [location[1], location[0]] : undefined,
    };
  });
};

const graphHopperSymbol = (sign: number | undefined, mode: TravelMode) => {
  if (sign === 0) return mode === "driving" ? "↗" : "↑";
  if (sign === 4) return "●";
  if (sign === -2 || sign === -3) return "←";
  if (sign === 2 || sign === 3) return "↱";
  if (sign === -6) return "↶";
  if (sign === 6) return "↷";
  return "↑";
};

const graphHopperInstructionKind = (
  sign: number | undefined,
): RouteGuidanceKind => {
  if (sign === 0) return "start";
  if (sign === 4) return "arrival";
  return "turn";
};

const graphHopperInstructionTitle = (
  sign: number | undefined,
  roadName: string | undefined,
  fallback: string | undefined,
) => {
  const roadContext = roadName ? ` pe ${roadName}` : "";
  const titleBySign: Record<number, string> = {
    "-3": "Virează strâns spre stânga",
    "-2": "Virează la stânga",
    "-1": "Ține ușor spre stânga",
    0: "Continuă",
    1: "Ține ușor spre dreapta",
    2: "Virează la dreapta",
    3: "Virează strâns spre dreapta",
    4: "Ai ajuns la destinație",
    6: "Intră în sensul giratoriu",
    "-6": "Întoarce",
    "-7": "Întoarce",
  };
  const title = sign === undefined ? fallback : titleBySign[sign] ?? fallback;
  if (!title) return roadName ? `Continuă${roadContext}` : "Continuă înainte";
  return roadName && !normalizeRoadName(title).includes(normalizeRoadName(roadName))
    ? `${title}${roadContext}`
    : title;
};

const graphHopperDetailValues = (
  path: GraphHopperPath,
  detailName: string,
  interval: [number, number] | undefined,
) => {
  const [start, end] = interval ?? [0, 0];
  return (path.details?.[detailName] ?? [])
    .filter(([from, to]) => from <= end && to >= start)
    .map(([, , value]) => value);
};

const slopeNumber = (value: string | number | boolean) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const graphHopperIncline = (
  path: GraphHopperPath,
  interval: [number, number] | undefined,
) => {
  const documentedSlopes = ["max_slope", "average_slope"]
    .flatMap((detail) => graphHopperDetailValues(path, detail, interval))
    .map(slopeNumber)
    .filter((value): value is number => value !== null);
  if (documentedSlopes.length) {
    return documentedSlopes.reduce(
      (steepest, value) => (Math.abs(value) > Math.abs(steepest) ? value : steepest),
    );
  }

  const coordinates = path.points?.coordinates ?? [];
  const [start, end] = interval ?? [0, 0];
  const segment = coordinates.slice(start, end + 1);
  if (segment.length < 2 || segment.some((point) => point[2] === undefined)) return null;

  let longestSlope: number | null = null;
  segment.slice(1).forEach((point, index) => {
    const previous = segment[index];
    const horizontalDistance = distanceBetween(
      [previous[1], previous[0]],
      [point[1], point[0]],
    );
    if (!horizontalDistance || previous[2] === undefined || point[2] === undefined) return;
    const slope = ((point[2] - previous[2]) / horizontalDistance) * 100;
    if (!longestSlope || Math.abs(slope) > Math.abs(longestSlope)) longestSlope = slope;
  });
  return longestSlope === null ? null : Math.round(longestSlope * 10) / 10;
};

const graphHopperSurface = (
  path: GraphHopperPath,
  interval: [number, number] | undefined,
): RouteSegment["surface"] => {
  const roughSurface = new Set(["gravel", "ground", "dirt", "grass", "unpaved", "sett"]);
  const values = graphHopperDetailValues(path, "surface", interval)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLocaleLowerCase("ro-RO"));
  if (!values.length) return "unknown";
  return values.some((value) => roughSurface.has(value)) ? "rough" : "smooth";
};

const graphHopperSegments = (
  path: GraphHopperPath,
  mode: TravelMode,
): RouteSegment[] => {
  const coordinates = path.points?.coordinates ?? [];
  const instructions = (path.instructions ?? []).filter((instruction) =>
    Number.isFinite(instruction.distance),
  );
  if (!instructions.length) {
    return [unknownRouteSegment(path.distance ?? 0)];
  }

  let previousRoadName: string | undefined;
  return instructions.map((instruction) => {
    const roadName = instruction.street_name?.trim() || undefined;
    const title = graphHopperInstructionTitle(
      instruction.sign,
      roadName,
      instruction.text?.trim(),
    );
    const coordinate = coordinates[instruction.interval?.[0] ?? 0];
    const fromRoadName = roadName ? undefined : previousRoadName;
    if (roadName) previousRoadName = roadName;
    return {
      ...unknownRouteSegment(Math.max(1, instruction.distance ?? 0)),
      incline: graphHopperIncline(path, instruction.interval),
      surface: graphHopperSurface(path, instruction.interval),
      instruction: title,
      instructionKind: graphHopperInstructionKind(instruction.sign),
      symbol: graphHopperSymbol(instruction.sign, mode),
      roadName,
      fromRoadName,
      position: coordinate ? [coordinate[1], coordinate[0]] : undefined,
    };
  });
};

const routePointAtDistance = (coordinates: Position[], distance: number) => {
  if (coordinates.length < 2) return coordinates[0] ?? [47.0105, 28.8353];
  let remaining = Math.max(0, distance);
  for (let index = 1; index < coordinates.length; index += 1) {
    const from = coordinates[index - 1];
    const to = coordinates[index];
    const length = distanceBetween(from, to);
    if (remaining <= length || index === coordinates.length - 1) {
      const ratio = length ? Math.min(1, remaining / length) : 0;
      return [
        from[0] + (to[0] - from[0]) * ratio,
        from[1] + (to[1] - from[1]) * ratio,
      ] as Position;
    }
    remaining -= length;
  }
  return coordinates[coordinates.length - 1];
};

export function buildRouteGuidance(
  route: EvaluatedRoute,
): RouteGuidanceItem[] {
  let passedDistance = 0;
  const guidance: RouteGuidanceItem[] = [];

  route.segments.forEach((segment, index) => {
    const position =
      segment.position ??
      routePointAtDistance(route.coordinates, passedDistance + segment.distance / 2);
    const rawInstruction = segment.instruction ??
      (index === 0
        ? "Pornește pe traseu"
        : index === route.segments.length - 1
          ? "Ai ajuns la destinație"
          : "Continuă înainte");
    const instruction = simplifyRoadTransition(rawInstruction);
    const normalizedInstruction = normalizeRoadName(instruction);
    // Nu atribuim o stradă veche unui viraj nou: denumirea din titlu este
    // numai strada după viraj, transmisă explicit de furnizorul de rutare.
    const instructionRoadContext = segment.roadName &&
      !normalizedInstruction.includes(normalizeRoadName(segment.roadName))
      ? ` pe ${segment.roadName}`
      : "";
    const kind = segment.instructionKind ??
        (index === 0
          ? "start"
          : index === route.segments.length - 1
            ? "arrival"
            : "continue");
    guidance.push({
        id: `turn-${route.id}-${index}`,
        kind,
        severity: "info",
        position,
        symbol: segment.symbol ?? (index === 0 ? "↑" : "→"),
        title: `${instruction}${instructionRoadContext}`,
        detail:
          kind === "start"
            ? `Parcurge ${formatDistance(segment.distance)}`
            : kind === "arrival"
              ? "Destinație"
              : `După viraj, continuă ${formatDistance(segment.distance)}`,
        sequence: index * 10,
    });

    passedDistance += segment.distance;
  });

  if (guidance[guidance.length - 1]?.kind !== "arrival") {
    guidance.push({
      id: `arrival-${route.id}`,
      kind: "arrival",
      severity: "info",
      position: route.coordinates[route.coordinates.length - 1] ?? route.coordinates[0],
      symbol: "●",
      title: "Ai ajuns la destinație",
      detail: "Destinație",
      sequence: route.segments.length * 10 + 1,
    });
  }

  return guidance.sort((a, b) => a.sequence - b.sequence);
}

async function getOsmRoutes(
  origin: Position,
  destination: Position,
  profile: AccessibilityProfile,
  signal?: AbortSignal,
  mode: TravelMode = "foot",
) {
  const direct = distanceBetween(origin, destination);
  if (direct < 10) {
    throw new Error(
      "Alege două puncte diferite, aflate la cel puțin 10 m distanță.",
    );
  }
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const coordinates = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
  const url = `${osmRoutingUrls[mode]}/${coordinates}?alternatives=true&overview=full&geometries=geojson&steps=true`;
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Serviciul de rutare nu a răspuns. Încearcă din nou.");
  }

  const payload = (await response.json()) as OsmRouteResponse;
  if (payload.code !== "Ok" || !payload.routes?.length) {
    throw new Error(
      payload.message ||
        (mode === "driving"
          ? "Nu a fost găsit un traseu auto între cele două puncte."
          : "Nu a fost găsit un traseu pietonal între cele două puncte."),
    );
  }

  const candidates = payload.routes
    .map((route, index): RouteCandidate | null => {
      const geometry = route.geometry?.coordinates;
      if (!geometry || geometry.length < 2) return null;
      return {
        id: `osm-${index}`,
        name:
          mode === "driving"
            ? index === 0
              ? "Ruta auto recomandată"
              : `Ruta auto alternativă ${index}`
            : index === 0
              ? "Ruta recomandată"
              : `Ruta alternativă ${index}`,
        coordinates: geometry.map(([longitude, latitude]) => [
          latitude,
          longitude,
        ]),
        duration: route.duration,
        segments: routeSegments(route, mode),
        mode,
      };
    })
    .filter((route): route is RouteCandidate => route !== null);

  if (!candidates.length) {
    throw new Error("Serviciul de rutare nu a returnat o geometrie utilizabilă.");
  }

  return recommendRoute(candidates, profile);
}

async function getGraphHopperRoutes(
  origin: Position,
  destination: Position,
  profile: AccessibilityProfile,
  signal: AbortSignal | undefined,
  mode: TravelMode,
) {
  const parameters = new URLSearchParams({
    profile: mode === "driving" ? "car" : "foot",
    locale: "ro",
    calc_points: "true",
    points_encoded: "false",
    instructions: "true",
    elevation: "true",
    key: graphHopperApiKey!,
  });
  ["average_slope", "max_slope", "surface", "road_access", "foot"].forEach((detail) =>
    parameters.append("details", detail),
  );
  parameters.append("point", `${origin[0]},${origin[1]}`);
  parameters.append("point", `${destination[0]},${destination[1]}`);

  const response = await fetch(
    `https://graphhopper.com/api/1/route?${parameters.toString()}`,
    { signal, headers: { Accept: "application/json" } },
  );
  const payload = (await response.json().catch(() => ({}))) as GraphHopperResponse;
  if (!response.ok || !payload.paths?.length) {
    throw new Error(
      payload.message || "GraphHopper nu a putut calcula traseul solicitat.",
    );
  }

  const candidates = payload.paths
    .map((path, index): RouteCandidate | null => {
      const geometry = path.points?.coordinates;
      if (
        !geometry ||
        geometry.length < 2 ||
        !Number.isFinite(path.distance) ||
        !Number.isFinite(path.time)
      ) {
        return null;
      }
      return {
        id: `graphhopper-${index}`,
        name:
          index === 0
            ? mode === "driving"
              ? "Ruta auto recomandată"
              : "Ruta recomandată"
            : `Ruta alternativă ${index}`,
        coordinates: geometry.map(([longitude, latitude]) => [
          latitude,
          longitude,
        ]),
        duration: (path.time ?? 0) / 1000,
        segments: graphHopperSegments(path, mode),
        mode,
      };
    })
    .filter((route): route is RouteCandidate => route !== null);
  if (!candidates.length) {
    throw new Error("GraphHopper nu a returnat o geometrie utilizabilă.");
  }
  return recommendRoute(candidates, profile);
}

export async function getRoutes(
  origin: Position,
  destination: Position,
  profile: AccessibilityProfile,
  signal?: AbortSignal,
  mode: TravelMode = "foot",
) {
  const direct = distanceBetween(origin, destination);
  if (direct < 10) {
    throw new Error(
      "Alege două puncte diferite, aflate la cel puțin 10 m distanță.",
    );
  }
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  if (graphHopperApiKey) {
    return getGraphHopperRoutes(origin, destination, profile, signal, mode);
  }
  return getOsmRoutes(origin, destination, profile, signal, mode);
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours
    ? `${hours} ${hours === 1 ? "oră" : "ore"}${remainder ? ` și ${remainder} min` : ""}`
    : `${minutes} min`;
}

export const formatDistance = (meters: number) =>
  meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toLocaleString("ro-RO", {
        maximumFractionDigits: 1,
      })} km`;
