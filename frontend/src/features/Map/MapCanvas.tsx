import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion } from "framer-motion";
import * as maplibregl from "maplibre-gl";
import { LocateFixed } from "lucide-react";
import type { GeoJSONSource } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { MapPlace, Position } from "../../types/place";
import { statusMeta } from "../../config/accessibility";
import { ErrorPopup } from "../../components/ErrorPopup";
import { evaluateAccessibility } from "../../utils/accessibility";
import type { ParkingLocation } from "./Parking";
import type { TravelMode } from "./routing";
import type { AccessibilityPoint } from "../../services/osmAccessibility";
import "maplibre-gl/dist/maplibre-gl.css";

// Vite must bundle the worker's shared imports for production GeoJSON rendering.
maplibregl.setWorkerUrl(workerUrl);

const lngLat = (position: Position): [number, number] => [
  position[1],
  position[0],
];
type Props = {
  places: MapPlace[];
  parking: ParkingLocation[];
  accessibilityPoints: AccessibilityPoint[];
  onSelect: (id: string) => void;
  onSelectParking: (parking: ParkingLocation) => void;
  onSelectAccessibility: (point: AccessibilityPoint) => void;
  target: Position | null;
  route: Position[] | null;
  origin: Position | null;
  destination: Position | null;
  userLocation: Position | null;
  travelMode: TravelMode;
  panelOpen: boolean;
  satellite: boolean;
  recenterPosition: Position;
  recenterVersion: number | null;
  onRecenter: () => void;
  onPick: (position: Position, place?: MapPlace) => void;
  picking: boolean;
};

type MarkerPosition = { x: number; y: number };

const markerPositionStyle = (
  position: MarkerPosition,
): CSSProperties =>
  ({
    "--map-marker-x": `${position.x}px`,
    "--map-marker-y": `${position.y}px`,
  }) as CSSProperties;

const wheelchairPassageAdvice = (point: AccessibilityPoint) => {
  const blocked =
    point.kind === "Scări" ||
    point.wheelchair === "Nu" ||
    point.wheelchair === "Acces blocat" ||
    point.ramp === "Fără rampă pentru scaun rulant" ||
    point.notes.some((note) => /indisponibil|interzis|blocat|nu este marcată o rampă/i.test(note));
  if (blocked) return "Nu este recomandat pentru scaun rulant";
  if (point.status === "problem") return "Trecere dificilă; alege o alternativă dacă este posibil";
  if (point.status === "limited") return "Se poate trece cu atenție";
  return "Trecere documentată ca accesibilă";
};

const wheelchairFacts = (point: AccessibilityPoint) => [
  point.incline && `Pantă ${point.incline}`,
  point.ramp,
  point.width && `Lățime ${point.width}`,
  point.kerb && `Bordură ${point.kerb.toLowerCase()}`,
  point.surface && `Suprafață ${point.surface.toLowerCase()}`,
].filter((fact): fact is string => Boolean(fact));

export function MapCanvas({
  places,
  parking,
  accessibilityPoints,
  onSelect,
  onSelectParking,
  onSelectAccessibility,
  target,
  route,
  origin,
  destination,
  userLocation,
  travelMode,
  panelOpen,
  satellite,
  recenterPosition,
  recenterVersion,
  onRecenter,
  onPick,
  picking,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [hoveredAccessibilityId, setHoveredAccessibilityId] = useState<string | null>(null);
  const [markerPositions, setMarkerPositions] = useState<{
    places: Record<string, MarkerPosition>;
    parking: Record<string, MarkerPosition>;
    accessibility: Record<string, MarkerPosition>;
    endpoints: Array<MarkerPosition | null>;
    user: MarkerPosition | null;
  }>({ places: {}, parking: {}, accessibility: {}, endpoints: [], user: null });
  const pickRef = useRef({ onPick, picking });
  pickRef.current = { onPick, picking };
  const updateMarkerPositions = useCallback(() => {
    const map = instance.current;
    if (!map || !ready) return;
    const project = (position: Position): MarkerPosition => {
      const point = map.project(lngLat(position));
      return { x: point.x, y: point.y };
    };
    setMarkerPositions({
      places: Object.fromEntries(
        places.map((place) => [place.id, project(place.position)]),
      ),
      parking: Object.fromEntries(
        parking.map((item) => [item.id, project(item.position)]),
      ),
      accessibility: Object.fromEntries(
        accessibilityPoints.map((point) => [point.id, project(point.position)]),
      ),
      endpoints: [origin, destination].map((point) =>
        point ? project(point) : null,
      ),
      user: userLocation ? project(userLocation) : null,
    });
  }, [accessibilityPoints, destination, origin, parking, places, ready, userLocation]);
  useEffect(() => {
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: container.current!,
        center: [28.8353, 47.0105],
        zoom: 13,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            },
            satellite: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              attribution: "Imagery © Esri",
            },
          },
          layers: [
            { id: "osm", type: "raster", source: "osm" },
            {
              id: "satellite",
              type: "raster",
              source: "satellite",
              layout: { visibility: "none" },
            },
          ],
        },
      });
      instance.current = map;
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.on("load", () => {
        setReady(true);
        map.resize();
      });
      map.on("error", () =>
        setError(
          "Fundalul hărții nu s-a încărcat complet. Locațiile rămân disponibile în listă.",
        ),
      );
      map.on("click", (event) => {
        if (pickRef.current.picking)
          pickRef.current.onPick([event.lngLat.lat, event.lngLat.lng]);
      });
    } catch {
      setError(
        "Harta necesită WebGL. Poți folosi lista de locații pentru detalii și raportare.",
      );
      return;
    }
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current!);
    return () => {
      resize.disconnect();
      map.remove();
      instance.current = null;
    };
  }, []);
  useEffect(() => {
    const map = instance.current;
    if (!map || !ready) return;
    updateMarkerPositions();
    map.on("move", updateMarkerPositions);
    map.on("resize", updateMarkerPositions);
    return () => {
      map.off("move", updateMarkerPositions);
      map.off("resize", updateMarkerPositions);
    };
  }, [ready, updateMarkerPositions]);
  useEffect(() => {
    const map = instance.current;
    if (!map || !ready) return;
    map.setLayoutProperty(
      "satellite",
      "visibility",
      satellite ? "visible" : "none",
    );
  }, [satellite, ready]);
  useEffect(() => {
    const map = instance.current;
    if (!map || !ready || !target) return;
    map.easeTo({
      center: lngLat(target),
      zoom: 15,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 650,
    });
  }, [target, ready]);
  useEffect(() => {
    const map = instance.current;
    if (!map || !ready || recenterVersion === null) return;
    map.easeTo({
      center: lngLat(recenterPosition),
      zoom: 13,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 650,
    });
  }, [ready, recenterPosition, recenterVersion]);
  useEffect(() => {
    const map = instance.current;
    if (!map || !ready) return;
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: route
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: route.map(lngLat) },
            },
          ]
        : [],
    };
    const source = map.getSource("route") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource("route", { type: "geojson", data });
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#ffffff",
          "line-width": 10,
          "line-opacity": 0.9,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#2f648d",
          "line-width": 6,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
    }
    if (route?.length) {
      const bounds = new maplibregl.LngLatBounds();
      route.forEach((point) => bounds.extend(lngLat(point)));
      const width = container.current?.clientWidth ?? 800;
      const height = container.current?.clientHeight ?? 500;
      const narrow = width < 700;
      map.fitBounds(bounds, {
        padding: {
          top: 80,
          right: 70,
          bottom: narrow ? Math.min(280, height * 0.45) : 65,
          left: narrow ? 35 : Math.min(435, width * 0.42),
        },
        maxZoom: 16,
        duration: 450,
      });
    }
    map.setPaintProperty(
      "route-line",
      "line-color",
      travelMode === "driving" ? "#3c8060" : "#2f648d",
    );
  }, [route, ready, travelMode]);
  return (
    <>
      <div
        ref={container}
        className={`urban-map-canvas${picking ? " is-picking" : ""}`}
        aria-label="Harta interactivă a Chișinăului"
      />
      {ready && (
        <div className="map-react-overlay">
          {places.map((place) => {
            const position = markerPositions.places[place.id];
            if (!position) return null;
            const assessment = evaluateAccessibility(place.accessibility);
            const status = assessment.status;
            const score = assessment.known ? `${assessment.score}/100` : "Fără scor public";
            return (
              <div
                className="map-marker-anchor"
                key={place.id}
                style={markerPositionStyle(position)}
              >
                <button
                  type="button"
                  className={`urban-marker status-${status}`}
                  aria-label={`${place.name} — ${statusMeta[status].label}, ${score}`}
                  title={`${place.name} · ${score}`}
                  onClick={() => {
                    if (picking) onPick(place.position, place);
                    else onSelect(place.id);
                  }}
                />
              </div>
            );
          })}
          {markerPositions.user && (
            <div
              className="map-marker-anchor live-location-anchor"
              style={markerPositionStyle(markerPositions.user)}
            >
              <span className="live-location-marker" aria-label="Locația mea live">
                <span aria-hidden="true" />
              </span>
            </div>
          )}
          {accessibilityPoints.map((point) => {
            const position = markerPositions.accessibility[point.id];
            if (!position) return null;
            const scoreLabel = point.score === null
              ? "date parțiale"
              : `scor ${point.score} din 100`;
            return (
              <div
                className={`map-marker-anchor accessibility-point-anchor${
                  hoveredAccessibilityId === point.id && !picking ? " is-tooltip-open" : ""
                }`}
                key={point.id}
                style={markerPositionStyle(position)}
              >
                <button
                  type="button"
                  className={`accessibility-point-marker is-${point.status}`}
                  aria-label={`${point.kind} pe ${point.streetName}, ${scoreLabel}`}
                  onPointerEnter={() => !picking && setHoveredAccessibilityId(point.id)}
                  onPointerLeave={() => setHoveredAccessibilityId(null)}
                  onFocus={() => !picking && setHoveredAccessibilityId(point.id)}
                  onBlur={() => setHoveredAccessibilityId(null)}
                  onClick={() =>
                    picking
                      ? onPick(point.position)
                      : onSelectAccessibility(point)
                  }
                >
                  <span aria-hidden="true">{point.status === "good" ? "✓" : "!"}</span>
                </button>
                {hoveredAccessibilityId === point.id && !picking && (
                  <div
                    className={`map-obstacle-tooltip is-${point.status}`}
                    role="tooltip"
                  >
                    <span className="map-obstacle-tooltip-label">
                      {point.osmType === "route-checkpoint"
                        ? "PUNCT DE VERIFICAT"
                        : "OBSTACOL PE TRASEU"}
                    </span>
                    <strong>{point.kind}</strong>
                    <span>{point.streetName}</span>
                    <b className={`map-obstacle-passage is-${point.status}`}>
                      {wheelchairPassageAdvice(point)}
                    </b>
                    {wheelchairFacts(point).length > 0 && (
                      <span className="map-obstacle-facts">{wheelchairFacts(point).join(" · ")}</span>
                    )}
                    <small>{point.notes.slice(0, 2).join(" ")}</small>
                    <em>{point.score === null ? "Scor parțial" : `Scor accesibilitate ${point.score}/100`}</em>
                  </div>
                )}
              </div>
            );
          })}
          {parking.map((item) => {
            const position = markerPositions.parking[item.id];
            if (!position) return null;
            return (
              <div
                className="map-marker-anchor"
                key={item.id}
                style={markerPositionStyle(position)}
              >
                <button
                  type="button"
                  className={`parking-marker${item.accessible ? " is-accessible" : ""}`}
                  aria-label={`${item.name} — ${item.address}`}
                  title={`${item.name} · ${item.address}`}
                  onClick={() => onSelectParking(item)}
                >
                  P
                </button>
              </div>
            );
          })}
          {[origin, destination].map((point, index) => {
            const position = markerPositions.endpoints[index];
            if (!point || !position) return null;
            return (
              <div
                className="map-marker-anchor endpoint-anchor"
                key={index ? "destination" : "origin"}
                style={markerPositionStyle(position)}
              >
                <span
                  className={`urban-endpoint endpoint-${index}`}
                  aria-label={index ? "Destinație" : "Punct de plecare"}
                >
                  {index ? "B" : "A"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {ready && (
        <motion.button
          className={`map-center-control${panelOpen ? " is-panel-open" : ""}`}
          type="button"
          aria-label="Recentrează harta"
          title="Recentrează harta"
          onClick={onRecenter}
          whileHover={{ y: -2, scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <LocateFixed size={18} />
        </motion.button>
      )}
      {!ready && !error && (
        <div className="map-loading-state" role="status">
          Se încarcă harta…
        </div>
      )}
      {error && (
        <ErrorPopup
          message={error}
        />
      )}
    </>
  );
}
