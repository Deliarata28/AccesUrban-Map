import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowLeftRight, CarFront, Check, ChevronRight, Clock3, Flag, Layers3, List, LocateFixed, MapPin, Pencil, Route, ShieldCheck, SlidersHorizontal, X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { ChoiceMenu } from "../../components/ChoiceMenu";
import { usePlaces, usePublicReports } from "../../hooks/useAppData";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  accessibilityFeatures,
  accessibilityValueLabel,
  placeCategories,
  sourceLabels,
  statusMeta,
} from "../../config/accessibility";
import type { AccessibilityProfile } from "../../stores/authStore";
import { reportTypeLabels, type MockReportType } from "../../stores/reportStore";
import { applyObstacleOverrides } from "../../stores/obstacleStore";
import type { MapPlace, Position } from "../../types/place";
import {
  evaluateAccessibility,
  filterPlaces,
  type PlaceFilters,
} from "../../utils/accessibility";
import { StatusBadge } from "../admin/AdminShared";
import { ObstacleEditor } from "../admin/ObstacleEditor";
import { ReportDialog, type ReportTarget } from "../reports/ReportDialog";
import { MapCanvas } from "./MapCanvas";
import { LocationSearch, type LocationOption } from "./LocationSearch";
import { reverseGeocodeMapPosition } from "../../services/locationSearch";
import {
  discoverAccessibleParking,
  type ParkingLocation,
} from "./Parking";
import {
  getRouteAccessibility,
  ROUTE_OBSTACLE_CORRIDOR_METERS,
  type RouteRoadName,
  type AccessibilityPoint,
} from "../../services/osmAccessibility";
import {
  buildRouteGuidance,
  getRoutes,
  profileLabels,
  travelModeLabels,
  formatDuration,
  formatDistance,
  type TravelMode,
} from "./routing";
import "./Map.css";

const asLocation = (place: MapPlace): LocationOption => ({
  label: place.name,
  position: place.position,
  placeId: place.id,
});

const asReportTarget = (place: MapPlace): ReportTarget => ({
  id: place.id,
  name: place.name,
  address: place.address,
  position: place.position,
});

const pointReportTarget = (
  position: Position,
  location?: Pick<LocationOption, "label" | "detail">,
): ReportTarget => {
  const coordinates = `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`;
  return {
    id: `map-point:${coordinates}`,
    name: location?.label ?? "Punct selectat pe hartă",
    address: location?.detail ?? "Loc selectat direct pe hartă",
    position,
  };
};

const isDocumented = (value: string) =>
  Boolean(value.trim()) && !/neconfirmat|necunoscut/i.test(value);

const accessibilityDetails = (point: AccessibilityPoint) =>
  [
    isDocumented(point.surface) ? `Suprafață: ${point.surface.toLowerCase()}` : "",
    isDocumented(point.kerb) ? `Bordură: ${point.kerb.toLowerCase()}` : "",
    isDocumented(point.tactilePaving)
      ? `Pavaj tactil: ${point.tactilePaving.toLowerCase()}`
      : "",
  ].filter(Boolean).join(" · ");

const accessibilityAccessDetails = (point: AccessibilityPoint) =>
  [
    isDocumented(point.wheelchair)
      ? `Acces rulant: ${point.wheelchair.toLowerCase()}`
      : "",
    isDocumented(point.width) ? `Lățime: ${point.width.toLowerCase()}` : "",
  ].filter(Boolean).join(" · ");

const distanceBetweenPositions = (a: Position, b: Position) => {
  const earthRadius = 6_371_000;
  const latitudeA = (a[0] * Math.PI) / 180;
  const latitudeB = (b[0] * Math.PI) / 180;
  const deltaLatitude = ((b[0] - a[0]) * Math.PI) / 180;
  const deltaLongitude = ((b[1] - a[1]) * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const distanceFromRoute = (position: Position, route: Position[]) => {
  const latitudeScale = Math.cos((position[0] * Math.PI) / 180);
  const metersPerDegree = 111_320;
  return Math.min(
    ...route.slice(1).map((to, index) => {
      const from = route[index];
      const ax = from[1] * latitudeScale;
      const ay = from[0];
      const bx = to[1] * latitudeScale;
      const by = to[0];
      const px = position[1] * latitudeScale;
      const py = position[0];
      const dx = bx - ax;
      const dy = by - ay;
      const denominator = dx * dx + dy * dy;
      const ratio = denominator
        ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator))
        : 0;
      return Math.hypot(
        px - (ax + ratio * dx),
        py - (ay + ratio * dy),
      ) * metersPerDegree;
    }),
  );
};

const progressAlongRoute = (position: Position, route: Position[]) => {
  const latitudeScale = Math.cos((position[0] * Math.PI) / 180);
  const metersPerDegree = 111_320;
  let travelled = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestProgress = 0;
  route.slice(1).forEach((to, index) => {
    const from = route[index];
    const ax = from[1] * latitudeScale;
    const ay = from[0];
    const bx = to[1] * latitudeScale;
    const by = to[0];
    const px = position[1] * latitudeScale;
    const py = position[0];
    const dx = bx - ax;
    const dy = by - ay;
    const denominator = dx * dx + dy * dy;
    const ratio = denominator
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator))
      : 0;
    const segmentLength = Math.hypot(dx, dy) * metersPerDegree;
    const distance = Math.hypot(
      px - (ax + ratio * dx),
      py - (ay + ratio * dy),
    ) * metersPerDegree;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestProgress = travelled + segmentLength * ratio;
    }
    travelled += segmentLength;
  });
  return closestProgress;
};

const reportObstacleKinds: Record<MockReportType, string> = {
  BLOCKED_RAMP: "Rampă blocată",
  DAMAGED_SIDEWALK: "Trotuar deteriorat",
  BROKEN_ELEVATOR: "Lift indisponibil",
  WRONG_INFORMATION: "Informație de acces incorectă",
  OTHER: "Obstacol raportat",
};

const reportObstacleScores: Record<MockReportType, number> = {
  BLOCKED_RAMP: 25,
  DAMAGED_SIDEWALK: 45,
  BROKEN_ELEVATOR: 30,
  WRONG_INFORMATION: 65,
  OTHER: 50,
};

const mapDefaultCenter: Position = [47.0105, 28.8353];

export function Map() {
  const user = useCurrentUser();
  const search = useSearch({ from: "/map" });
  const navigate = useNavigate();
  const placesQuery = usePlaces();
  const publicReportsQuery = usePublicReports();
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const [panel, setPanel] = useState<
    "list" | "filters" | "place" | "parking" | "route" | null
  >(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedParking, setSelectedParking] = useState<ParkingLocation | null>(null);
  const [searchValue, setSearchValue] = useState<LocationOption | null>(null);
  const [origin, setOrigin] = useState<LocationOption | null>(null);
  const [destination, setDestination] = useState<LocationOption | null>(null);
  const parkingQuery = useQuery({
    queryKey: ["osm-accessible-parking-v1"],
    queryFn: ({ signal }) => discoverAccessibleParking(signal),
    staleTime: 10 * 60 * 1000,
    enabled: !!destination,
  });
  const accessibleParking = parkingQuery.data ?? [];
  const [target, setTarget] = useState<Position | null>(null);
  const [profile, setProfile] = useState<AccessibilityProfile>(
    user?.accessibilityProfile ?? "WHEELCHAIR",
  );
  const [travelMode, setTravelMode] = useState<TravelMode>("foot");
  const [filters, setFilters] = useState<PlaceFilters>({});
  const [satellite, setSatellite] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [picking, setPicking] = useState<
    "origin" | "destination" | "report" | null
  >(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [recenterVersion, setRecenterVersion] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [livePosition, setLivePosition] = useState<Position | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "active" | "error"
  >("idle");
  const pointLookup = useRef<AbortController | null>(null);
  const pointLookupVersion = useRef(0);
  const [selectedAccessibilityPoint, setSelectedAccessibilityPoint] =
    useState<AccessibilityPoint | null>(null);
  const [editingAccessibilityPoint, setEditingAccessibilityPoint] =
    useState<AccessibilityPoint | null>(null);
  const focusAccessibilityPoint = (point: AccessibilityPoint) => {
    setSelectedAccessibilityPoint(point);
    setTarget(point.position);
  };
  const selected = places.find((place) => place.id === selectedId);
  const filtered = useMemo(
    () => filterPlaces(places, filters),
    [places, filters],
  );
  const mapPlaces = useMemo(() => {
    const categoryPriority: Record<string, number> = {
      Spital: 1,
      Farmacie: 2,
      "Instituție publică": 3,
      Universitate: 4,
      Școală: 5,
      Transport: 6,
      "Centru comercial": 7,
      Parc: 8,
      Muzeu: 9,
      Catedrală: 10,
      Aeroport: 11,
      "Clădire istorică": 12,
    };
    return filtered
      .filter((place) => {
        const assessment = evaluateAccessibility(place.accessibility);
        return categoryPriority[place.category] !== undefined && assessment.known > 0;
      })
      .sort((a, b) => {
        const categoryOrder =
          (categoryPriority[a.category] ?? 99) - (categoryPriority[b.category] ?? 99);
        if (categoryOrder !== 0) return categoryOrder;
        return a.name.localeCompare(b.name, "ro");
      })
      .slice(0, 90);
  }, [filtered]);
  const routesQuery = useQuery({
    queryKey: [
      "routes",
      origin?.position,
      destination?.position,
      profile,
      travelMode,
    ],
    queryFn: ({ signal }) =>
      getRoutes(
        origin!.position,
        destination!.position,
        profile,
        signal,
        travelMode,
      ),
    enabled: !!origin && !!destination,
  });
  const selectedRoute = routesQuery.data?.routes.find(
    (route) => route.id === (routeId ?? routesQuery.data.recommendedId),
  );
  const routeCoordinates =
    selectedRoute && !selectedRoute.blocked ? selectedRoute.coordinates : null;
  const routeGuidance = useMemo(
    () =>
      selectedRoute && !selectedRoute.blocked
        ? buildRouteGuidance(selectedRoute)
        : [],
    [selectedRoute],
  );
  const routeRoads = useMemo<RouteRoadName[]>(
    () =>
      selectedRoute?.segments.flatMap((segment) => {
        const name = segment.roadName ?? segment.fromRoadName;
        return name && segment.position ? [{ name, position: segment.position }] : [];
      }) ?? [],
    [selectedRoute],
  );
  const panelAnimationKey =
    panel === "route"
      ? `route-${origin?.placeId ?? origin?.label ?? "empty"}-${destination?.placeId ?? destination?.label ?? "empty"}-${selectedRoute?.id ?? "pending"}`
      : panel;
  const routeAccessibilityQuery = useQuery({
    queryKey: [
      "route-accessibility-obstacles-v4",
      selectedRoute?.id,
      origin?.position,
      destination?.position,
    ],
    queryFn: ({ signal }) =>
      getRouteAccessibility(selectedRoute!.coordinates, signal, routeRoads),
    enabled: !!selectedRoute && !selectedRoute.blocked,
    staleTime: 10 * 60 * 1000,
  });
  const approvedReportPoints = useMemo<AccessibilityPoint[]>(
    () =>
      (publicReportsQuery.data ?? []).flatMap((report) => {
        if (!report.position) return [];
        const score = reportObstacleScores[report.type];
        return [{
          id: `report-${report.id}`,
          position: report.position,
          kind: reportObstacleKinds[report.type],
          osmType: `community-report:${report.type}`,
          streetName: report.placeName,
          score,
          status: score >= 70 ? "limited" : "problem",
          surface: "",
          kerb: "",
          tactilePaving: "",
          wheelchair:
            report.type === "BLOCKED_RAMP" || report.type === "BROKEN_ELEVATOR"
              ? "Acces blocat"
              : "",
          width: "",
          photoUrl: report.photoUrl,
          notes: [
            report.description,
            `Raport aprobat: ${reportTypeLabels[report.type]}.`,
          ],
        } satisfies AccessibilityPoint];
      }),
    [publicReportsQuery.data],
  );
  const routeReportedPoints = routeCoordinates
    ? approvedReportPoints.filter(
        (report) =>
          distanceFromRoute(report.position, routeCoordinates) <=
          ROUTE_OBSTACLE_CORRIDOR_METERS,
      )
    : [];
  const accessibilityPoints = applyObstacleOverrides([
    ...routeReportedPoints,
    ...(routeAccessibilityQuery.data ?? []),
  ])
    .filter((point) => point.status !== "good")
    .sort(
      (a, b) =>
        (routeCoordinates ? progressAlongRoute(a.position, routeCoordinates) : 0) -
        (routeCoordinates ? progressAlongRoute(b.position, routeCoordinates) : 0),
    );
  const routeWarningPoints = accessibilityPoints;
  const destinationParking = useMemo(
    () =>
      routeCoordinates && destination
        ? accessibleParking.filter(
            (parking) =>
              parking.accessible === true &&
              distanceBetweenPositions(parking.position, destination.position) <= 10,
          )
        : [],
    [accessibleParking, destination, routeCoordinates],
  );
  const assessment = selected
    ? evaluateAccessibility(selected.accessibility)
    : null;
  const filterCount =
    (filters.category ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.minScore ? 1 : 0) +
    (filters.facilities?.length ?? 0) +
    (filters.verifiedOnly ? 1 : 0);
  useEffect(() => {
    setProfile(user?.accessibilityProfile ?? "WHEELCHAIR");
  }, [user?.accessibilityProfile]);
  useEffect(() => {
    return () => {
      pointLookup.current?.abort();
    };
  }, []);
  useEffect(() => {
    setRouteId(null);
    setSelectedAccessibilityPoint(null);
  }, [origin, destination, profile, travelMode]);
  useEffect(() => {
    if (!search.place || !placesQuery.data) return;
    const place = placesQuery.data.find((item) => item.id === search.place);
    if (place) {
      setSelectedId(place.id);
      setTarget(place.position);
      setPanel("place");
    } else setMessage("Această locație nu mai este disponibilă.");
  }, [search.place, placesQuery.data]);
  useEffect(() => {
    if (search.lat === undefined || search.lng === undefined) return;
    setTarget([search.lat, search.lng]);
    setSelectedId(null);
    setSelectedParking(null);
    setPanel(null);
  }, [search.lat, search.lng]);
  useEffect(() => {
    if (
      !user ||
      search.reportLat === undefined ||
      search.reportLng === undefined
    ) {
      return;
    }
    const position: Position = [search.reportLat, search.reportLng];
    const fallbackTarget = pointReportTarget(position);
    setTarget(position);
    setSelectedId(null);
    setSelectedParking(null);
    setPanel(null);
    setReporting({
      id: search.reportTargetId ?? fallbackTarget.id,
      name: search.reportName ?? fallbackTarget.name,
      address: search.reportAddress ?? fallbackTarget.address,
      position,
    });
  }, [
    search.reportAddress,
    search.reportLat,
    search.reportLng,
    search.reportName,
    search.reportTargetId,
    placesQuery.data,
    user,
  ]);
  useEffect(() => {
    if (!placesQuery.data) return;
    const sync = (location: LocationOption | null) => {
      if (!location?.placeId) return location;
      const place = placesQuery.data.find(
        (item) => item.id === location.placeId,
      );
      if (!place) return null;
      return place.name === location.label &&
        place.position[0] === location.position[0] &&
        place.position[1] === location.position[1]
        ? location
        : asLocation(place);
    };
    setOrigin(sync);
    setDestination(sync);
    setSearchValue(sync);
  }, [placesQuery.data]);
  const reset = () => {
    setPanel(null);
    setSelectedId(null);
    setSelectedParking(null);
    setSearchValue(null);
    setOrigin(null);
    setDestination(null);
    setRouteId(null);
    setPicking(null);
    setMessage("");
    if (search.place || search.lat !== undefined || search.lng !== undefined)
      void navigate({ to: "/map", search: {}, replace: true });
  };
  const showPlace = (id: string) => {
    const place = places.find((p) => p.id === id);
    if (place) {
      setSelectedId(id);
      setSelectedParking(null);
      setTarget([...place.position]);
      setPanel("place");
      setPicking(null);
    }
  };
  const startRoute = (location: LocationOption) => {
    setDestination(location);
    setSelectedId(location.placeId ?? null);
    setSelectedParking(null);
    setTarget([...location.position]);
    setPanel("route");
    setPicking(null);
  };
  const showParking = (parking: ParkingLocation) => {
    setSelectedParking(parking);
    setSelectedId(null);
    setTarget([...parking.position]);
    setPanel("parking");
    setPicking(null);
  };
  const chooseSearch = (location: LocationOption) => {
    setSearchValue(location);
    startRoute(location);
  };
  const resolvePickedLocation = async (
    point: Position,
    pickedPlace?: MapPlace,
  ): Promise<LocationOption> => {
    if (pickedPlace) return asLocation(pickedPlace);

    const nearbyPlace = places
      .map((place) => ({
        place,
        distance: distanceBetweenPositions(place.position, point),
      }))
      .filter(({ distance }) => distance <= 20)
      .sort((a, b) => a.distance - b.distance)[0]?.place;
    if (nearbyPlace) return asLocation(nearbyPlace);

    pointLookup.current?.abort();
    const controller = new AbortController();
    pointLookup.current = controller;
    return reverseGeocodeMapPosition(point, controller.signal);
  };
  const pickPointOnMap = async (point: Position, pickedPlace?: MapPlace) => {
    const mode = picking;
    if (!mode) return;
    const lookupVersion = ++pointLookupVersion.current;
    setMessage("Se identifică locul ales…");

    let location: LocationOption;
    try {
      location = await resolvePickedLocation(point, pickedPlace);
    } catch {
      location = {
        label: "Punct selectat pe hartă",
        detail: "Adresă indisponibilă momentan",
        position: point,
      };
    }
    if (lookupVersion !== pointLookupVersion.current) return;

    if (mode === "origin") setOrigin(location);
    else if (mode === "destination") setDestination(location);
    else {
      setTarget(point);
      setSelectedId(null);
      setSelectedParking(null);
      setPanel(null);
      setReporting(
        pickedPlace
          ? asReportTarget(pickedPlace)
          : pointReportTarget(point, location),
      );
    }
    setMessage("");
    setPicking(null);
    if (mode !== "report") setPanel("route");
  };
  const recenterMap = () => {
    setTarget(null);
    setRecenterVersion((version) => (version ?? 0) + 1);
    setMessage("Harta a fost recentrată.");
  };
  const requestLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("error");
      setMessage("Browserul nu oferă acces la locația live.");
      return;
    }
    if (locationState === "loading") return;
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position: Position = [coords.latitude, coords.longitude];
        setLivePosition(position);
        setOrigin({ label: "Locația mea live", position });
        setTarget(position);
        setLocationState("active");
        setMessage("Locația live a fost aleasă ca punct de plecare.");
      },
      () => {
        setLocationState("error");
        setMessage("Nu am putut obține locația live. Permite accesul și încearcă din nou.");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
  };
  const updateFilter = <K extends keyof PlaceFilters>(
    key: K,
    value: PlaceFilters[K],
  ) => setFilters((previous) => ({ ...previous, [key]: value }));
  const closeReport = () => {
    setReporting(null);
    if (routeCoordinates) setPanel("route");
    if (search.reportLat !== undefined || search.reportLng !== undefined) {
      void navigate({
        to: "/map",
        search: {
          place: search.place,
          lat: search.lat,
          lng: search.lng,
        },
        replace: true,
      });
    }
  };
  return (
    <section
      className="map-workspace urban-map"
      aria-label="Hartă și locații accesibile"
    >
              <MapCanvas
        places={routeCoordinates && !picking ? [] : mapPlaces}
        parking={routeCoordinates && travelMode === "driving" ? destinationParking : []}
        accessibilityPoints={
          !picking
            ? routeCoordinates
              ? routeWarningPoints
              : approvedReportPoints
            : []
        }
        onSelect={showPlace}
        onSelectParking={showParking}
        onSelectAccessibility={focusAccessibilityPoint}
        target={target}
        route={routeCoordinates}
        origin={origin?.position ?? null}
        destination={destination?.position ?? null}
        userLocation={livePosition}
        travelMode={travelMode}
        panelOpen={panel !== null}
        satellite={satellite}
        recenterPosition={mapDefaultCenter}
        recenterVersion={recenterVersion}
        onRecenter={recenterMap}
        picking={!!picking}
        onPick={(point, pickedPlace) => {
          void pickPointOnMap(point, pickedPlace);
        }}
      />
      {selectedAccessibilityPoint && (
        <motion.aside
          className="map-accessibility-popover"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          aria-label="Detalii de accesibilitate"
        >
          <div className="map-accessibility-popover-heading">
            <div>
              <span>{selectedAccessibilityPoint.kind}</span>
              <h3>{selectedAccessibilityPoint.streetName}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Închide detaliile de accesibilitate"
              onClick={() => setSelectedAccessibilityPoint(null)}
            >
              <X />
            </Button>
          </div>
          <div className="accessibility-score-line">
            <strong>
              {selectedAccessibilityPoint.score === null
                ? "Date parțiale"
                : `${selectedAccessibilityPoint.score}/100`}
            </strong>
            <span>
              {selectedAccessibilityPoint.status === "good"
                ? "Accesibil"
                : selectedAccessibilityPoint.status === "limited"
                  ? "Acces parțial"
                  : selectedAccessibilityPoint.status === "problem"
                    ? "Acces dificil"
                    : "Necesită verificare"}
            </span>
          </div>
          <dl className="accessibility-facts">
            <div><dt>Tip</dt><dd>{selectedAccessibilityPoint.kind}</dd></div>
            {isDocumented(selectedAccessibilityPoint.surface) && <div><dt>Suprafață</dt><dd>{selectedAccessibilityPoint.surface}</dd></div>}
            {isDocumented(selectedAccessibilityPoint.kerb) && <div><dt>Bordură</dt><dd>{selectedAccessibilityPoint.kerb}</dd></div>}
            {isDocumented(selectedAccessibilityPoint.tactilePaving) && <div><dt>Pavaj tactil</dt><dd>{selectedAccessibilityPoint.tactilePaving}</dd></div>}
            {isDocumented(selectedAccessibilityPoint.wheelchair) && <div><dt>Acces rulant</dt><dd>{selectedAccessibilityPoint.wheelchair}</dd></div>}
            {isDocumented(selectedAccessibilityPoint.width) && <div><dt>Lățime</dt><dd>{selectedAccessibilityPoint.width}</dd></div>}
          </dl>
          <ul className="accessibility-notes">
            {selectedAccessibilityPoint.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
          {selectedAccessibilityPoint.photoUrl && (
            <a
              className="map-accessibility-photo"
              href={selectedAccessibilityPoint.photoUrl}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={selectedAccessibilityPoint.photoUrl}
                alt={`Fotografie pentru ${selectedAccessibilityPoint.kind}`}
              />
              <span>Deschide fotografia raportată</span>
            </a>
          )}
          {user?.role === "ADMIN" && (
            <Button
              variant="outline"
              size="sm"
              className="edit-accessibility-point"
              onClick={() => setEditingAccessibilityPoint(selectedAccessibilityPoint)}
            >
              <Pencil />
              Editează detaliile
            </Button>
          )}
        </motion.aside>
      )}
      <div className="urban-map-toolbar">
        <LocationSearch
          label="Caută locație"
          placeholder="Caută o locație… "
          places={places}
          value={searchValue}
          onSelect={chooseSearch}
          onClear={reset}
        />
        <Button
          variant="secondary"
          size="icon"
          className={panel === "filters" ? "is-active" : ""}
          aria-label="Filtre de accesibilitate"
          aria-pressed={panel === "filters"}
          onClick={() => setPanel(panel === "filters" ? null : "filters")}
        >
          <SlidersHorizontal />
          {filterCount > 0 && <b className="filter-count">{filterCount}</b>}
        </Button>
      </div>
      <div className="urban-map-tools">
        <motion.div
          className="map-tool-motion"
          whileHover={{ y: -2, scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Button
            variant="secondary"
            size="icon"
            title="Lista locațiilor"
            aria-label="Lista locațiilor"
            aria-pressed={panel === "list"}
            onClick={() => setPanel(panel === "list" ? null : "list")}
          >
            <List />
          </Button>
        </motion.div>
        <motion.div
          className="map-tool-motion"
          whileHover={{ y: -2, scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Button
            variant="secondary"
            size="icon"
            title="Selectează punctul problemei"
            aria-label="Selectează punctul problemei"
            onClick={() => {
              setPicking("report");
              setPanel(null);
            }}
          >
            <Flag />
          </Button>
        </motion.div>
        <motion.div
          className="map-tool-motion"
          whileHover={{ y: -2, scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Button
            variant="secondary"
            size="icon"
            title="Deschide traseul"
            aria-label="Deschide traseul"
            aria-pressed={panel === "route"}
            onClick={() => setPanel(panel === "route" ? null : "route")}
          >
            <Route />
          </Button>
        </motion.div>
        <motion.div
          className="map-tool-motion"
          whileHover={{ y: -2, scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Button
            variant="secondary"
            size="icon"
            title={satellite ? "Hartă stradală" : "Hartă satelit"}
            aria-label={satellite ? "Hartă stradală" : "Hartă satelit"}
            aria-pressed={satellite}
            onClick={() => setSatellite(!satellite)}
          >
            <Layers3 />
          </Button>
        </motion.div>
      </div>
      {picking && (
        <div className="map-pick-message" role="status">
          {picking === "origin"
            ? "Alege punctul de plecare"
            : picking === "destination"
              ? "Alege destinația"
              : "Alege punctul problemei"}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Anulează alegerea punctului"
            onClick={() => setPicking(null)}
          >
            <X />
          </Button>
        </div>
      )}
      {message && (
        <div className="map-feedback" role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="Închide mesajul">
            ×
          </button>
        </div>
      )}
      {placesQuery.isPending && (
        <div className="map-feedback" role="status">
          Se încarcă locațiile…
        </div>
      )}
      {placesQuery.error && (
        <div className="map-feedback" role="alert">
          {placesQuery.error.message}
          <Button onClick={() => void placesQuery.refetch()}>Reîncearcă</Button>
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {panel && (
        <motion.aside
          key={panelAnimationKey}
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`urban-map-panel ${panel === "route" ? "is-route" : ""} ${picking ? "is-picking" : ""}`}
          aria-label={
            panel === "route"
              ? "Planificarea traseului"
              : panel === "filters"
                ? "Filtre"
                : panel === "parking"
                  ? "Detalii parcare"
                : "Locații"
          }
        >
          <div className="map-panel-heading">
            <div>
              <span>
                {panel === "route"
                  ? "DE LA A LA B"
                  : panel === "filters"
                    ? "PERSONALIZEAZĂ HARTA"
                    : panel === "parking"
                      ? "PARCARE PE HARTĂ"
                    : "CHIȘINĂU, MAI ACCESIBIL"}
              </span>
              <h2>
                {panel === "route"
                  ? "Planifică traseul"
                  : panel === "filters"
                    ? "Accesul de care ai nevoie"
                    : panel === "list"
                      ? "Locații pe hartă"
                      : panel === "parking"
                        ? "Detalii parcare"
                      : "Detalii locație"}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                panel === "route"
                  ? "Închide și șterge traseul"
                  : "Închide panoul"
              }
              onClick={
                panel === "route" || panel === "place" || panel === "parking"
                  ? reset
                  : () => setPanel(null)
              }
            >
              <X />
            </Button>
          </div>
          {panel === "filters" && (
            <div className="map-panel-body">
              <div className="field">
                <Label htmlFor="map-category">Categorie</Label>
                <ChoiceMenu
                  id="map-category"
                  value={filters.category ?? ""}
                  options={[
                    { value: "", label: "Toate categoriile" },
                    ...placeCategories.map((c) => ({
                      value: c.label,
                      label: c.label,
                    })),
                  ]}
                  onChange={(value) => updateFilter("category", value)}
                />
              </div>
              <div className="field">
                <Label htmlFor="map-status">Accesibilitate</Label>
                <ChoiceMenu
                  id="map-status"
                  value={filters.status ?? ""}
                  options={[
                    { value: "", label: "Toate nivelurile" },
                    ...Object.entries(statusMeta).map(([value, meta]) => ({
                      value,
                      label: meta.label,
                    })),
                  ]}
                  onChange={(value) => updateFilter("status", value)}
                />
              </div>
              <div className="field">
                <Label htmlFor="map-score">
                  Scor minim: {filters.minScore ?? 0}/100
                </Label>
                <input
                  id="map-score"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={filters.minScore ?? 0}
                  onChange={(e) =>
                    updateFilter("minScore", Number(e.target.value))
                  }
                />
              </div>
              <fieldset className="map-facility-filters">
                <legend>Facilități necesare</legend>
                {accessibilityFeatures.map((feature) => (
                  <label key={feature.key}>
                    <input
                      type="checkbox"
                      checked={
                        filters.facilities?.includes(feature.key) ?? false
                      }
                      onChange={(e) =>
                        updateFilter(
                          "facilities",
                          e.target.checked
                            ? [...(filters.facilities ?? []), feature.key]
                            : (filters.facilities ?? []).filter(
                                (key) => key !== feature.key,
                              ),
                        )
                      }
                    />
                    {feature.label}
                  </label>
                ))}
              </fieldset>
              <label className="map-check">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly ?? false}
                  onChange={(e) =>
                    updateFilter("verifiedOnly", e.target.checked)
                  }
                />
                Doar informații verificate în teren
              </label>
              <div className="filter-result-count" role="status">
                {filtered.length} locații corespund filtrelor
              </div>
              <div className="map-panel-actions">
                <Button variant="outline" onClick={() => setFilters({})}>
                  Resetează
                </Button>
                <Button
                  onClick={() => setPanel("list")}
                >
                  Vezi locațiile <ChevronRight />
                </Button>
              </div>
            </div>
          )}
          {panel === "list" && (
            <div className="map-place-list">
              <p className="map-list-count">
                {filtered.length} din {places.length} locații{" "}
                {filterCount ? "· filtre active" : ""}
              </p>
              {filtered.map((place) => {
                const score = evaluateAccessibility(place.accessibility);
                return (
                  <motion.button
                    className="map-place-list-item"
                    key={place.id}
                    onClick={() => showPlace(place.id)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.16 }}
                  >
                    <span
                      className="list-pin"
                      style={{ color: statusMeta[score.status].color }}
                    >
                      <MapPin size={22} />
                    </span>
                    <span>
                      <strong>{place.name}</strong>
                      <small>
                        {place.category} · {place.address}
                      </small>
                      <StatusBadge status={score.status} />
                    </span>
                    <ChevronRight size={16} />
                  </motion.button>
                );
              })}
              {!filtered.length && (
                <div className="map-empty">
                  <MapPin />
                  <h3>Nicio locație găsită</h3>
                  <p>Încearcă mai puține filtre pentru a vedea alte locuri.</p>
                  <Button variant="outline" onClick={() => setFilters({})}>
                    Resetează filtrele
                  </Button>
                </div>
              )}
            </div>
          )}
          {panel === "parking" && selectedParking && (
            <div className="map-panel-body parking-detail">
              <div className="parking-detail-title">
                <span className="parking-detail-badge">P</span>
                <div>
                  <span>{selectedParking.access}</span>
                  <h3>{selectedParking.name}</h3>
                </div>
              </div>
              <p className="place-detail-address">
                <MapPin size={15} />
                {selectedParking.address}
              </p>
              <p className="place-description">{selectedParking.note}</p>
              <div
                className={`parking-access-status ${selectedParking.accessible ? "is-confirmed" : "is-unknown"}`}
              >
                <ShieldCheck size={17} />
                <span>
                  {selectedParking.accessible
                    ? "Locuri rezervate pentru persoane cu dizabilități"
                    : "Locurile rezervate nu sunt confirmate în datele disponibile"}
                </span>
              </div>
              <div className="parking-info-card">
                <CarFront size={18} />
                <span>Poți calcula traseul auto până la această parcare.</span>
              </div>
              <div className="map-panel-actions">
                <Button
                  onClick={() => {
                    setTravelMode("driving");
                    startRoute({
                      label: selectedParking.name,
                      position: selectedParking.position,
                    });
                  }}
                >
                  <Route />
                  Calculează traseu
                </Button>
              </div>
            </div>
          )}
          {panel === "place" && selected && assessment && (
            <div className="map-panel-body">
              <div className="place-detail-title">
                <span>{selected.category}</span>
                <h3>{selected.name}</h3>
                <p>
                  <MapPin size={15} />
                  {selected.address}
                </p>
              </div>
              <div className="place-score-card">
                <div>
                  <small>Scor de accesibilitate</small>
                  <strong>
                    {assessment.known ? assessment.score : "—"}
                    <span>/100</span>
                  </strong>
                </div>
                <StatusBadge status={assessment.status} />
              </div>
              <p className="place-description">{selected.note}</p>
              {(selected.openingHours || selected.phone || selected.website) && (
                <div className="place-public-details">
                  {selected.openingHours && (
                    <div>
                      <span>Program</span>
                      <strong>{selected.openingHours}</strong>
                    </div>
                  )}
                  {selected.phone && (
                    <div>
                      <span>Telefon</span>
                      <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                    </div>
                  )}
                  {selected.website && (
                    <div>
                      <span>Site oficial</span>
                      <a href={selected.website} target="_blank" rel="noreferrer">
                        Deschide site-ul
                      </a>
                    </div>
                  )}
                </div>
              )}
              {accessibilityFeatures.some(
                (feature) => selected.accessibility[feature.key] !== "necunoscut",
              ) && (
              <div className="place-facilities">
                {accessibilityFeatures
                  .filter(
                    (feature) => selected.accessibility[feature.key] !== "necunoscut",
                  )
                  .map((feature) => (
                  <div key={feature.key}>
                    <span>{feature.label}</span>
                    <b
                      className={`facility-value value-${selected.accessibility[feature.key]}`}
                    >
                      {selected.accessibility[feature.key] === "da" && (
                        <Check size={12} />
                      )}
                      {
                        accessibilityValueLabel[
                          selected.accessibility[feature.key]
                        ]
                      }
                    </b>
                  </div>
                ))}
              </div>
              )}
              <p className="place-source">
                <ShieldCheck size={15} />
                {sourceLabels[selected.source]} ·{" "}
                {selected.verified
                  ? "Adresă și poziție confirmate"
                  : "Date adăugate de comunitate"}
                <small>
                  Actualizat:{" "}
                  {new Date(selected.updatedAt).toLocaleDateString("ro-RO")} ·{" "}
                  {assessment.known}/7 facilități documentate public
                </small>
              </p>
              <div className="map-panel-actions">
                <Button
                  onClick={() => {
                    startRoute(asLocation(selected));
                  }}
                >
                  <Route />
                  Setează destinația
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setReporting(asReportTarget(selected))}
                >
                  <Flag />
                  Raportează o problemă
                </Button>
              </div>
            </div>
          )}
          {panel === "place" && !selected && (
            <div className="map-empty">
              <p>Locația nu mai este disponibilă.</p>
              <Button onClick={() => setPanel("list")}>
                Vezi alte locații
              </Button>
            </div>
          )}
          {panel === "route" && (
            <div className="map-panel-body">
              <div className="route-stops-heading">
                <strong>Alege două locații</strong>
                <span>Plecarea și destinația pot fi selectate din catalog sau direct pe hartă.</span>
              </div>
              <div className="route-endpoint">
                <span className="endpoint-letter">A</span>
                <LocationSearch
                  label="Punct de plecare"
                  places={places}
                  value={origin}
                  onSelect={setOrigin}
                  onClear={() => setOrigin(null)}
                  placeholder="Alege punctul de plecare"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Alege plecarea pe hartă"
                  onClick={() => setPicking("origin")}
                >
                  <MapPin />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="route-live-location"
                onClick={requestLiveLocation}
                disabled={locationState === "loading"}
              >
                <LocateFixed />
                {locationState === "loading"
                  ? "Se caută locația live…"
                  : "Folosește locația mea live ca plecare"}
              </Button>
              <div className="route-swap">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Inversează plecarea și destinația"
                  onClick={() => {
                    setOrigin(destination);
                    setDestination(origin);
                  }}
                >
                  <ArrowLeftRight />
                </Button>
              </div>
              <div className="route-endpoint">
                <span className="endpoint-letter destination">B</span>
                <LocationSearch
                  label="Destinație"
                  places={places}
                  value={destination}
                  onSelect={setDestination}
                  onClear={() => {
                    setDestination(null);
                    setSearchValue(null);
                  }}
                  placeholder="Alege destinația"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Alege destinația pe hartă"
                  onClick={() => setPicking("destination")}
                >
                  <MapPin />
                </Button>
              </div>
              <div className="field">
                <Label htmlFor="route-mode">Mod de deplasare</Label>
                <ChoiceMenu
                  id="route-mode"
                  value={travelMode}
                  options={Object.entries(travelModeLabels).map(
                    ([value, label]) => ({ value, label }),
                  )}
                  onChange={(value) => setTravelMode(value as TravelMode)}
                />
              </div>
              {travelMode === "foot" && <div className="field">
                <Label htmlFor="route-profile">Adaptează traseul pentru</Label>
                <ChoiceMenu
                  id="route-profile"
                  value={profile}
                  options={Object.entries(profileLabels).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={(value) => setProfile(value as AccessibilityProfile)}
                />
              </div>}
              {travelMode === "driving" && (
                <div className="route-mode-note">
                  <CarFront size={17} />
                  <span>
                    Ruta auto urmează străzile. Durata este o estimare fără trafic în timp real.
                  </span>
                </div>
              )}
              {!origin || !destination ? (
                <div className="route-instruction">
                  <Route size={25} />
                  <p>
                    Alege punctul de plecare și destinația din catalog sau
                    direct de pe hartă.
                  </p>
                </div>
              ) : routesQuery.isPending ? (
                <p role="status">Se compară variantele de traseu…</p>
              ) : routesQuery.error ? (
                <div className="form-error" role="alert">
                  {routesQuery.error.message}
                </div>
              ) : (
                <>
                  <div
                    className="route-variants"
                    aria-label="Variante de traseu"
                  >
                    {routesQuery.data?.routes.map((route) => (
                      <motion.button
                        className={
                          selectedRoute?.id === route.id ? "selected" : ""
                        }
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.16 }}
                        key={route.id}
                        disabled={route.blocked}
                        onClick={() => setRouteId(route.id)}
                        aria-pressed={selectedRoute?.id === route.id}
                      >
                        <span>
                          <strong>{route.name}</strong>
                          <small>
                            {route.blocked
                              ? "Exclus: conține scări sau acces interzis"
                              : `${formatDistance(route.distance)} · ${formatDuration(route.duration)}`}
                          </small>
                        </span>
                        {route.id === routesQuery.data.recommendedId ? (
                          <b>Recomandat</b>
                        ) : route.blocked ? (
                          <X size={17} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </motion.button>
                    ))}
                  </div>
                  {!routesQuery.data?.recommendedId && (
                    <p className="form-error" role="alert">
                      Nu există o variantă compatibilă cu acest profil.
                    </p>
                  )}
                  {selectedRoute && !selectedRoute.blocked && (
                    <div className="route-result">
                      <div className="route-result-metrics">
                        <div>
                          <Route size={17} />
                          <strong>
                            {formatDistance(selectedRoute.distance)}
                          </strong>
                          <small>Distanță estimată</small>
                        </div>
                        <div>
                          <Clock3 size={17} />
                          <strong>
                            {formatDuration(selectedRoute.duration)}
                          </strong>
                          <small>Durată estimată</small>
                        </div>
                      </div>
                      {routeAccessibilityQuery.isPending && (
                        <div className="route-accessibility-loading" role="status">
                          <strong>Se verifică traseul</strong>
                          <span>Se caută suprafața, trecerile și obstacolele documentate pe OpenStreetMap.</span>
                          <i aria-hidden="true" />
                          <i aria-hidden="true" />
                          <i aria-hidden="true" />
                        </div>
                      )}
                      {routeAccessibilityQuery.isError && (
                        <p className="route-accessibility-error" role="alert">
                          {routeAccessibilityQuery.error instanceof Error
                            ? routeAccessibilityQuery.error.message
                            : "Avertizările de pe traseu nu au putut fi încărcate."}
                        </p>
                      )}
                      {!routeAccessibilityQuery.isPending &&
                        !routeAccessibilityQuery.isError &&
                        accessibilityPoints.length === 0 && (
                          <div className="route-accessibility-empty">
                            <strong>Nu au fost găsite obstacole documentate pe această rută.</strong>
                            <span>Harta afișează doar elementele cu avertizare confirmate în datele OpenStreetMap.</span>
                          </div>
                        )}
                      {accessibilityPoints.length > 0 && (
                        <section className="route-accessibility-summary" aria-label="Accesibilitate pe traseu">
                          <div className="route-accessibility-summary-heading">
                            <div>
                              <span>DOCUMENTATE PE TRASEUL ALES</span>
                              <h3>Obstacole pe traseu</h3>
                            </div>
                            <strong>
                              {accessibilityPoints.length} găsite
                            </strong>
                          </div>
                          <p>
                            Obstacolele documentate sunt afișate pe tot parcursul rutei A–B, în ordinea deplasării. Scorul fiecăruia este calculat din datele disponibile.
                          </p>
                          <div className="route-accessibility-stats" aria-label="Rezumat accesibilitate traseu">
                            <span className="is-warning">{routeWarningPoints.filter((point) => point.status === "limited").length} limitate</span>
                            <span className="is-problem">{routeWarningPoints.filter((point) => point.status === "problem").length} probleme</span>
                          </div>
                          <div className="route-accessibility-items">
                            {accessibilityPoints.map((point) => (
                              <button
                                type="button"
                                key={point.id}
                                className={`route-obstacle-card is-${point.status}`}
                                aria-label={`${point.kind}, ${point.streetName}, scor ${point.score === null ? "nedisponibil" : `${point.score} din 100`}`}
                                onClick={() => focusAccessibilityPoint(point)}
                              >
                                <span className={`accessibility-mini-dot is-${point.status}`} />
                                <span>
                                  <b>{point.kind} · {point.streetName}</b>
                                  {accessibilityDetails(point) && <small>{accessibilityDetails(point)}</small>}
                                  {accessibilityAccessDetails(point) && <small>{accessibilityAccessDetails(point)}</small>}
                                  <small>{point.notes[0] ?? "Detalii despre obstacol disponibile la deschidere."}</small>
                                </span>
                                <strong>{point.score === null ? "—" : `${point.score}/100`}</strong>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}
                      {routeGuidance.length > 0 && (
                        <section
                          className="route-guidance"
                          aria-labelledby="route-guidance-title"
                        >
                          <div className="route-guidance-heading">
                            <div>
                              <span>GHIDARE PE TRASEU</span>
                              <h3 id="route-guidance-title">
                                Indicații pe traseu
                              </h3>
                            </div>
                            <b>{routeGuidance.length} indicații</b>
                          </div>
                          <ol className="route-guidance-list">
                            {routeGuidance.map((item) => (
                              <li
                                className={`route-guidance-item is-${item.severity}`}
                                key={item.id}
                              >
                                <span
                                  className="route-guidance-symbol"
                                  aria-hidden="true"
                                >
                                  {item.symbol}
                                </span>
                                <div>
                                  <strong>{item.title}</strong>
                                  <small>{item.detail}</small>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </section>
                      )}
                    </div>
                  )}
                </>
              )}
              {destination?.placeId && (
                <Button
                  variant="outline"
                  onClick={() => showPlace(destination.placeId!)}
                >
                  <MapPin />
                  Detaliile destinației
                </Button>
              )}
            </div>
          )}
        </motion.aside>
        )}
      </AnimatePresence>
        <div className="map-bottom-bar">
        <div className="map-legend" aria-label="Legenda hărții">
          {Object.entries(statusMeta).map(([status, meta]) => (
            <span key={status}>
              <i className={`status-legend-dot status-${status}`} />
              {meta.label}
            </span>
          ))}
          {travelMode === "driving" && (!routeCoordinates || destinationParking.length > 0) && (
            <span>
              <i className="parking-legend-dot" />
              Parcări
            </span>
          )}
        </div>
        {user && (
          <Link to="/rapoartele-mele" className="map-reports-link">
            Rapoartele mele
          </Link>
        )}
      </div>
      {reporting && (
        <ReportDialog
          key={reporting.id}
          target={reporting}
          onClose={closeReport}
        />
      )}
      {editingAccessibilityPoint && (
        <ObstacleEditor
          point={editingAccessibilityPoint}
          onClose={() => setEditingAccessibilityPoint(null)}
          onSaved={(point) => {
            setSelectedAccessibilityPoint(point);
            setEditingAccessibilityPoint(null);
            void routeAccessibilityQuery.refetch();
          }}
        />
      )}
    </section>
  );
}
