import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { Accessibility, Bus, Car, Layers3, LocateFixed, MapPinned, Route, Satellite, Search, X } from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./Map.css";

type AccessibilityStatus = "accesibil" | "partial" | "redus" | "necunoscut";
type BaseLayerKey = "strazi" | "satelit";
type TravelMode = "wheelchair" | "transit" | "driving";
type Position = [number, number];
type AccessibilityValue = "da" | "nu" | "necunoscut";
type AccessibilityFeature =
  | "rampa"
  | "intrareFaraTrepte"
  | "lift"
  | "toaletaAccesibila"
  | "parcareAccesibila"
  | "pavajTactil"
  | "semnalAudio";

type MapPlace = {
  id: string;
  name: string;
  address: string;
  status: AccessibilityStatus;
  position: Position;
  note: string;
  category: string;
  categoryColor: string;
  aliases?: string[];
  accessibility: Record<AccessibilityFeature, AccessibilityValue>;
};

type LocationOption = {
  position: Position;
  label: string;
  detail?: string;
};

type AccessibleParking = {
  id: number;
  position: Position;
  name: string;
  capacity?: string;
};

type RouteInfo = {
  coordinates: Position[];
  distance: number;
  duration: number;
  directions: Array<{
    instruction: string;
    distance: number;
    position: Position;
    symbol: string;
  }>;
};

const accessibilityFeatures: Array<{
  key: AccessibilityFeature;
  label: string;
  points: number;
}> = [
  { key: "rampa", label: "Rampă", points: 20 },
  { key: "intrareFaraTrepte", label: "Intrare fără trepte", points: 25 },
  { key: "lift", label: "Lift", points: 15 },
  { key: "toaletaAccesibila", label: "Toaletă accesibilă", points: 15 },
  { key: "parcareAccesibila", label: "Parcare accesibilă", points: 10 },
  { key: "pavajTactil", label: "Pavaj tactil", points: 10 },
  { key: "semnalAudio", label: "Semnal audio", points: 5 },
];

const DEFAULT_CENTER: Position = [47.0105, 28.8353];
const DEFAULT_ZOOM = 13;
const ACCESSIBLE_PARKING_QUERY =
  "[out:json][timeout:25];(" +
  'node(46.94,28.75,47.10,28.95)["amenity"="parking_space"]["parking_space"="disabled"];' +
  'way(46.94,28.75,47.10,28.95)["amenity"="parking_space"]["parking_space"="disabled"];' +
  'node(46.94,28.75,47.10,28.95)["amenity"="parking"]["disabled"="yes"];' +
  'way(46.94,28.75,47.10,28.95)["amenity"="parking"]["disabled"="yes"];' +
  'node(46.94,28.75,47.10,28.95)["amenity"="parking"]["disabled"="designated"];' +
  'way(46.94,28.75,47.10,28.95)["amenity"="parking"]["disabled"="designated"];' +
  'node(46.94,28.75,47.10,28.95)["amenity"="parking"]["capacity:disabled"];' +
  'way(46.94,28.75,47.10,28.95)["amenity"="parking"]["capacity:disabled"];' +
  'node(46.94,28.75,47.10,28.95)["amenity"="parking_space"]["wheelchair"="designated"];' +
  'way(46.94,28.75,47.10,28.95)["amenity"="parking_space"]["wheelchair"="designated"];' +
  ");out center tags;";

const layers = {
  strazi: {
    label: "Străzi",
    hint: "Hartă clară pentru orientare.",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">Contribuitorii OpenStreetMap</a>',
  },
  satelit: {
    label: "Satelit",
    hint: "Imagini aeriene pentru orientare.",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagini &copy; Esri",
  },
} satisfies Record<BaseLayerKey, { label: string; hint: string; url: string; attribution: string }>;

const statusMeta: Record<AccessibilityStatus, { label: string; color: string }> = {
  accesibil: { label: "Accesibil", color: "#76b798" },
  partial: { label: "Parțial accesibil", color: "#d7ae5d" },
  redus: { label: "Acces redus", color: "#d87f91" },
  necunoscut: { label: "Necunoscut", color: "#9aa8b6" },
};

const accessibilityProfiles: Record<
  "good" | "complete" | "partial" | "limited" | "unknown",
  Record<AccessibilityFeature, AccessibilityValue>
> = {
  good: {
    rampa: "da",
    intrareFaraTrepte: "da",
    lift: "da",
    toaletaAccesibila: "da",
    parcareAccesibila: "da",
    pavajTactil: "da",
    semnalAudio: "nu",
  },
  complete: {
    rampa: "da",
    intrareFaraTrepte: "da",
    lift: "da",
    toaletaAccesibila: "da",
    parcareAccesibila: "da",
    pavajTactil: "da",
    semnalAudio: "da",
  },
  partial: {
    rampa: "da",
    intrareFaraTrepte: "da",
    lift: "nu",
    toaletaAccesibila: "da",
    parcareAccesibila: "nu",
    pavajTactil: "necunoscut",
    semnalAudio: "nu",
  },
  limited: {
    rampa: "nu",
    intrareFaraTrepte: "da",
    lift: "nu",
    toaletaAccesibila: "nu",
    parcareAccesibila: "da",
    pavajTactil: "nu",
    semnalAudio: "nu",
  },
  unknown: {
    rampa: "necunoscut",
    intrareFaraTrepte: "necunoscut",
    lift: "necunoscut",
    toaletaAccesibila: "necunoscut",
    parcareAccesibila: "necunoscut",
    pavajTactil: "necunoscut",
    semnalAudio: "necunoscut",
  },
};

const places: MapPlace[] = [
  {
    id: "biblioteca",
    name: "Biblioteca Municipală",
    address: "Bulevardul Ștefan cel Mare 148, Centru",
    status: "accesibil",
    position: [47.024, 28.825],
    note: "Intrare fără trepte, traseu scurt și spațiu bun pentru manevră.",
    category: "Instituție publică",
    categoryColor: "#a3bd78",
    accessibility: {
      rampa: "da",
      intrareFaraTrepte: "da",
      lift: "da",
      toaletaAccesibila: "da",
      parcareAccesibila: "nu",
      pavajTactil: "da",
      semnalAudio: "nu",
    },
  },
  {
    id: "policlinica",
    name: "Spital municipal",
    address: "Strada București 41, Centru",
    status: "partial",
    position: [47.016, 28.836],
    note: "Acces posibil, dar unele zone au nevoie de ajustări suplimentare.",
    category: "Spital",
    categoryColor: "#dc9690",
    accessibility: {
      rampa: "da",
      intrareFaraTrepte: "da",
      lift: "nu",
      toaletaAccesibila: "da",
      parcareAccesibila: "nu",
      pavajTactil: "necunoscut",
      semnalAudio: "nu",
    },
  },
  {
    id: "parcare",
    name: "Parcare publică",
    address: "Strada 31 August 1989 78, Centru",
    status: "redus",
    position: [47.0085, 28.846],
    note: "Trotuar îngust și denivelări pe traseul pietonal din apropiere.",
    category: "Transport",
    categoryColor: "#7aa9c9",
    accessibility: {
      rampa: "nu",
      intrareFaraTrepte: "da",
      lift: "nu",
      toaletaAccesibila: "nu",
      parcareAccesibila: "da",
      pavajTactil: "nu",
      semnalAudio: "nu",
    },
  },
  {
    id: "mall",
    name: "Shopping MallDova",
    address: "Strada Arborilor 21, Botanica",
    status: "partial",
    position: [46.9875, 28.8595],
    note: "Parcarea accesibilă și intrarea aleasă pot fi consultate înainte de deplasare.",
    category: "Magazin",
    categoryColor: "#78b4b8",
    aliases: ["malldova", "mall dova"],
    accessibility: {
      rampa: "da",
      intrareFaraTrepte: "da",
      lift: "necunoscut",
      toaletaAccesibila: "necunoscut",
      parcareAccesibila: "da",
      pavajTactil: "necunoscut",
      semnalAudio: "necunoscut",
    },
  },
  {
    id: "usm",
    name: "Universitatea de Stat din Moldova",
    address: "Strada Alexei Mateevici 60, Centru",
    status: "accesibil",
    position: [47.0188, 28.8244],
    note: "Campus universitar accesibil, cu rampă, intrări fără trepte, lift, toaletă accesibilă, parcare rezervată și trasee adaptate.",
    category: "Universitate",
    categoryColor: "#93a0d6",
    aliases: ["usm"],
    accessibility: accessibilityProfiles.complete,
  },
  {
    id: "utm",
    name: "Universitatea Tehnică a Moldovei",
    address: "Strada Studenților 9/9, Rîșcani",
    status: "accesibil",
    position: [47.062, 28.86996],
    note: "Campus UTM prietenos pentru persoane cu mobilitate redusă, cu parcare rezervată, rampă, intrare fără trepte, lift, toaletă accesibilă, pavaj tactil și semnal audio.",
    category: "Universitate",
    categoryColor: "#93a0d6",
    aliases: ["utm", "universitatea tehnica a moldovei", "universitatea tehnică a moldovei"],
    accessibility: accessibilityProfiles.complete,
  },
  {
    id: "farmacie",
    name: "Farmacie",
    address: "Bulevardul Ștefan cel Mare, Centru",
    status: "accesibil",
    position: [47.0186, 28.8313],
    note: "Punct de farmacie disponibil pentru verificare în teren.",
    category: "Farmacie",
    categoryColor: "#d58c9b",
    accessibility: accessibilityProfiles.good,
  },
  {
    id: "hotel-national",
    name: "Hotel Național",
    address: "Bulevardul Ștefan cel Mare 4, Centru",
    status: "partial",
    position: [47.0138, 28.8339],
    note: "Verifică disponibilitatea liftului și a intrării fără trepte.",
    category: "Hotel",
    categoryColor: "#aa91ca",
    accessibility: accessibilityProfiles.partial,
  },
  {
    id: "parcul-stefan",
    name: "Parcul Ștefan cel Mare",
    address: "Strada 31 August 1989, Centru",
    status: "partial",
    position: [47.0249, 28.8296],
    note: "Alei cu acces variabil, în funcție de intrare.",
    category: "Parc",
    categoryColor: "#84ae8c",
    accessibility: accessibilityProfiles.partial,
  },
  {
    id: "gara",
    name: "Gara Feroviară Chișinău",
    address: "Piața Gării 1, Centru",
    status: "partial",
    position: [47.0009, 28.8596],
    note: "Alege o intrare cu acces fără trepte.",
    category: "Transport",
    categoryColor: "#7aa9c9",
    accessibility: accessibilityProfiles.partial,
  },
  {
    id: "restaurant",
    name: "Restaurant în Centru",
    address: "Strada București, Centru",
    status: "accesibil",
    position: [47.0188, 28.8382],
    note: "Intrare la nivelul trotuarului.",
    category: "Restaurant",
    categoryColor: "#dd9b7b",
    accessibility: accessibilityProfiles.good,
  },
  {
    id: "liceu",
    name: "Liceu teoretic",
    address: "Strada Nicolae Iorga, Centru",
    status: "redus",
    position: [47.0217, 28.8219],
    note: "Accesibilitatea clădirii trebuie confirmată.",
    category: "Școală",
    categoryColor: "#d8b657",
    accessibility: accessibilityProfiles.limited,
  },
  {
    id: "primarie",
    name: "Primăria Chișinău",
    address: "Bulevardul Ștefan cel Mare 83, Centru",
    status: "accesibil",
    position: [47.0231, 28.8321],
    note: "Instituție publică cu informații de accesibilitate afișate.",
    category: "Instituție publică",
    categoryColor: "#a3bd78",
    accessibility: accessibilityProfiles.good,
  },
  {
    id: "muzeu",
    name: "Muzeul Național de Artă",
    address: "Strada 31 August 1989 115, Centru",
    status: "necunoscut",
    position: [47.0221, 28.8267],
    note: "Datele despre accesibilitate așteaptă confirmare.",
    category: "Altă locație",
    categoryColor: "#9caab2",
    accessibility: accessibilityProfiles.unknown,
  },
];

const placeCategories = [
  { label: "Spital", color: "#dc9690" },
  { label: "Farmacie", color: "#d58c9b" },
  { label: "Instituție publică", color: "#a3bd78" },
  { label: "Școală", color: "#d8b657" },
  { label: "Universitate", color: "#93a0d6" },
  { label: "Restaurant", color: "#dd9b7b" },
  { label: "Magazin", color: "#78b4b8" },
  { label: "Hotel", color: "#aa91ca" },
  { label: "Parc", color: "#84ae8c" },
  { label: "Transport", color: "#7aa9c9" },
  { label: "Altă locație", color: "#9caab2" },
];

const placeToLocation = (place: MapPlace): LocationOption => ({
  position: place.position,
  label: place.name,
  detail: place.address,
});

const scoreFor = (place: MapPlace) =>
  accessibilityFeatures.reduce(
    (score, feature) =>
      place.accessibility[feature.key] === "da" ? score + feature.points : score,
    0,
  );

const accessibilityValueLabel: Record<AccessibilityValue, string> = {
  da: "DA",
  nu: "NU",
  necunoscut: "NECUNOSCUT",
};

function routeInstruction(
  step: { maneuver?: { type?: string; modifier?: string }; name?: string },
) {
  const street = step.name ? " pe " + step.name : "";
  const type = step.maneuver?.type;
  const modifier = step.maneuver?.modifier;

  if (type === "depart") return "Pornește" + street;
  if (type === "arrive") return "Ai ajuns la destinație";
  if (modifier === "left") return "Virează  la stânga" + street;
  if (modifier === "right") return "Virează la dreapta" + street;
  if (modifier === "straight") return "Continuă înainte" + street;
  if (modifier === "uturn") return "Întoarce-te" + street;
  return "Continuă" + street;
}

function routeSymbol(step: { maneuver?: { type?: string; modifier?: string } }) {
  if (step.maneuver?.type === "depart") return "↑";
  if (step.maneuver?.type === "arrive") return "●";
  if (step.maneuver?.modifier === "left") return "←";
  if (step.maneuver?.modifier === "right") return "→";
  return "↑";
}

function markerIcon(color: string) {
  return L.divIcon({
    className: "map-marker",
    html: '<span class="map-marker__pin" style="background:' + color + '"></span>',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

function pointIcon(kind: "search" | "start" | "end") {
  return L.divIcon({
    className: "map-route-marker",
    html: '<span class="map-route-marker__dot map-route-marker__dot--' + kind + '"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

function directionIcon(index: number) {
  return L.divIcon({
    className: "map-direction-marker",
    html: '<span class="map-direction-marker__number"><b>' + (index + 1) + "</b></span>",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function accessibleParkingIcon() {
  return L.divIcon({
    className: "map-parking-marker",
    html: '<span class="map-parking-marker__pin" aria-label="Parcare accesibilă"><b>P</b></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function ViewController({
  target,
  route,
}: {
  target: Position | null;
  route: RouteInfo | null;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (target) {
      map.flyTo(target, 16, { animate: true, duration: 0.7 });
    }
  }, [map, target]);

  useEffect(() => {
    if (route && route.coordinates.length > 1) {
      map.fitBounds(L.latLngBounds(route.coordinates), {
        animate: true,
        paddingTopLeft: [420, 70],
        paddingBottomRight: [50, 70],
      });
    }
  }, [map, route]);

  return null;
}

async function searchLocations(query: string, signal: AbortSignal): Promise<LocationOption[]> {
  const response = await fetch(
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=md&accept-language=ro&q=" +
      encodeURIComponent(query),
    { signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("search_failed");

  const data: Array<{ lat: string; lon: string; display_name: string }> = await response.json();
  return data.map((item) => ({
    position: [Number(item.lat), Number(item.lon)],
    label: item.display_name,
  }));
}

function MapSearch({
  onSelect,
  onDirections,
  onPlaces,
  onDirectionsHover,
  onPlacesHover,
  onControlLeave,
  routeButtonRef,
  routeOpen,
}: {
  onSelect: (location: LocationOption) => void;
  onDirections: () => void;
  onPlaces: () => void;
  onDirectionsHover: () => void;
  onPlacesHover: () => void;
  onControlLeave: () => void;
  routeButtonRef: RefObject<HTMLButtonElement | null>;
  routeOpen: boolean;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;

    const controller = new AbortController();
    setLoading(true);
    try {
      const [location] = await searchLocations(query.trim(), controller.signal);
      if (location) {
        onSelect(location);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="map-search-row">
      <form className="map-search" onSubmit={submit}>
        <label className="map-search__field">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută o locație"
            aria-label="Caută o locație"
          />
        </label>
        <button className="map-search__button" type="submit" disabled={loading} aria-label="Caută locația" title="Caută locația">
          <Search size={20} aria-hidden="true" />
        </button>
        <button
          ref={routeButtonRef}
          className="map-search__directions"
          type="button"
          onClick={onDirections}
          onMouseEnter={onDirectionsHover}
          onMouseLeave={() => undefined}
          aria-expanded={routeOpen}
          aria-controls="map-route"
          title="Direcții"
          aria-label="Deschide direcțiile"
        >
          <Route size={20} aria-hidden="true" />
        </button>
      </form>
      <button
        className="map-locations-button"
        type="button"
        onClick={onPlaces}
        onMouseEnter={onPlacesHover}
        onMouseLeave={onControlLeave}
        title="Locații"
        aria-label="Filtrează locațiile"
      >
        <MapPinned size={18} aria-hidden="true" />
        <span>Locații</span>
      </button>
    </div>
  );
}

function AccessibleParkingMarkers({ visible }: { visible: boolean }) {
  const [parkings, setParkings] = useState<AccessibleParking[]>([]);

  useEffect(() => {
    if (!visible || parkings.length) return;

    const controller = new AbortController();
    fetch(
      "https://overpass-api.de/api/interpreter?data=" +
        encodeURIComponent(ACCESSIBLE_PARKING_QUERY),
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) throw new Error("parking_fetch_failed");
        return response.json();
      })
      .then((data: {
        elements?: Array<{
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      }) => {
        const nextParkings: AccessibleParking[] = [];
        (data.elements ?? []).forEach((element) => {
          const lat = element.lat ?? element.center?.lat;
          const lng = element.lon ?? element.center?.lon;
          if (lat === undefined || lng === undefined) return;
          nextParkings.push({
            id: element.id,
            position: [lat, lng],
            name: element.tags?.name ?? "Parcare accesibilă",
            capacity: element.tags?.["capacity:disabled"],
          });
        });
        setParkings(nextParkings);
      })
      .catch(() => {
        if (!controller.signal.aborted) setParkings([]);
      });

    return () => controller.abort();
  }, [parkings.length, visible]);

  if (!visible) return null;

  return (
    <>
      {parkings.map((parking) => (
        <Marker key={parking.id} position={parking.position} icon={accessibleParkingIcon()}>
          <Popup className="map-popup">
            <article>
              <p className="map-popup__status" style={{ color: "#1760bd" }}>
                Parcare accesibilă
              </p>
              <h3>{parking.name}</h3>
              <p>
                {parking.capacity
                  ? "Locuri rezervate: " + parking.capacity
                  : "Parcare pentru persoane cu dizabilități, marcată în OpenStreetMap."}
              </p>
            </article>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function RouteLocationField({
  id,
  label,
  kind,
  selected,
  onSelect,
  onClear,
}: {
  id: string;
  label: string;
  kind: "start" | "end";
  selected: LocationOption | null;
  onSelect: (location: LocationOption) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(selected?.label ?? "");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [open, setOpen] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setQuery(selected.label);
    setHasTyped(false);
    setOpen(false);
  }, [selected]);

  useEffect(() => {
    if (!open || !hasTyped) return;
    const normalized = query.trim().toLocaleLowerCase("ro");
    const local = places
      .map(placeToLocation)
      .filter(
        (place) =>
          !normalized ||
          place.label.toLocaleLowerCase("ro").includes(normalized) ||
          place.detail?.toLocaleLowerCase("ro").includes(normalized),
      );
    setOptions(local);
    if (normalized.length < 3) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const remote = await searchLocations(query, controller.signal);
        const combined = [...local, ...remote].filter(
          (option, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.label === option.label &&
                candidate.position[0] === option.position[0] &&
                candidate.position[1] === option.position[1],
            ) === index,
        );
        setOptions(combined);
      } catch {
        if (!controller.signal.aborted) setOptions(local);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [hasTyped, open, query]);

  return (
    <div className="map-route-field" onMouseLeave={() => setOpen(false)}>
      <label htmlFor={id}>{label}</label>
      <div className="map-route-field__input">
        <i className={"map-route-field__dot map-route-field__dot--" + kind} aria-hidden="true" />
        <input
          id={id}
          value={query}
          autoComplete="off"
          placeholder={kind === "start" ? "Alege punctul de plecare" : "Alege destinația"}
          onFocus={() => {
            if (hasTyped) setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setHasTyped(true);
            onClear();
            setOpen(true);
          }}
        />
        {query ? (
          <button
            className="map-route-field__clear"
            type="button"
            aria-label={"Șterge " + label.toLocaleLowerCase("ro")}
            onClick={() => {
              setQuery("");
              setHasTyped(false);
              onClear();
              setOpen(false);
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="map-route-suggestions" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.label + option.position.join("-")}
              type="button"
              role="option"
              aria-selected={option.label === selected?.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(option);
                setQuery(option.label);
                setHasTyped(false);
                setOpen(false);
              }}
            >
              <MapPinned size={17} aria-hidden="true" />
              <span>
                <strong>{option.label}</strong>
                {option.detail ? <small>{option.detail}</small> : null}
              </span>
            </button>
          ))}
          {loading ? <p>Se caută locații…</p> : null}
          {!loading && options.length === 0 ? <p>Nu am găsit locații.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

const formatDistance = (distance: number) =>
  distance >= 1000
    ? (distance / 1000).toLocaleString("ro-MD", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + " km"
    : Math.round(distance) + " m";

const formatMinutes = (minutes: number, approximate = false) => {
  const totalMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const hourLabel = hours === 1 ? "oră" : "ore";
  const label = hours
    ? hours + " " + hourLabel + (remainingMinutes ? " și " + remainingMinutes + " min" : "")
    : remainingMinutes + " min";

  return (approximate ? "~" : "") + label;
};

const formatDuration = (duration: number) => formatMinutes(duration / 60);

const estimatedRouteDuration = (distance: number, drivingDuration: number, mode: TravelMode) => {
  if (mode === "wheelchair") {
    // Average outdoor wheelchair speed: 3.3 km/h, including safer crossings.
    return formatMinutes(Math.max(1, Math.ceil(distance / 55)), true);
  }

  if (mode === "transit") {
    // Includes walking to a stop and a typical wait. Exact line times need an official feed.
    return formatMinutes(Math.max(8, Math.ceil(distance / 180) + 7), true);
  }

  return formatDuration(drivingDuration);
};

export function Map() {
  const [activeLayer, setActiveLayer] = useState<BaseLayerKey>("strazi");
  const [searchResult, setSearchResult] = useState<LocationOption | null>(null);
  const [focusTarget, setFocusTarget] = useState<Position | null>(null);
  const [panel, setPanel] = useState<"layers" | "places" | null>(null);
  const [showPlaces, setShowPlaces] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    placeCategories.map((category) => category.label),
  );
  const [routeOpen, setRouteOpen] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>("wheelchair");
  const [origin, setOrigin] = useState<LocationOption | null>(null);
  const [destination, setDestination] = useState<LocationOption | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeMessage, setRouteMessage] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [session, setSession] = useState(0);
  const hoverCloseTimer = useRef<number | null>(null);
  const layersButton = useRef<HTMLButtonElement>(null);
  const routeButton = useRef<HTMLButtonElement>(null);

  const resetMap = () => {
    setActiveLayer("strazi");
    setSearchResult(null);
    setFocusTarget(null);
    setPanel(null);
    setShowPlaces(true);
    setSelectedCategories(placeCategories.map((category) => category.label));
    setRouteOpen(false);
    setTravelMode("wheelchair");
    setOrigin(null);
    setDestination(null);
    setRoute(null);
    setRouteMessage("");
    setSelectedPlace(null);
    setSearchResetKey((value) => value + 1);
    setSession((value) => value + 1);
  };

  const clearHoverClose = () => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const scheduleHoverClose = () => {
    clearHoverClose();
    hoverCloseTimer.current = window.setTimeout(() => {
      setPanel(null);
      setRouteOpen(false);
      hoverCloseTimer.current = null;
    }, 220);
  };

  const openOnHover = (next: "layers" | "places" | "route") => {
    clearHoverClose();
    setPanel(next === "route" ? null : next);
    setRouteOpen(next === "route");
  };

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetMap();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => () => clearHoverClose(), []);

  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null);
      return;
    }

    const controller = new AbortController();
    setRouteMessage("Se calculează traseul…");
    const endpoint =
      "https://router.project-osrm.org/route/v1/driving/" +
      origin.position[1] +
      "," +
      origin.position[0] +
      ";" +
      destination.position[1] +
      "," +
      destination.position[0] +
      "?overview=full&geometries=geojson&steps=true";

    fetch(endpoint, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("route_failed");
        return response.json();
      })
      .then((data: {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: { coordinates: [number, number][] };
          legs?: Array<{
            steps?: Array<{
              distance: number;
              name?: string;
              maneuver?: {
                type?: string;
                modifier?: string;
                location?: [number, number];
              };
            }>;
          }>;
        }>;
      }) => {
        const result = data.routes?.[0];
        if (!result) throw new Error("route_not_found");
        setRoute({
          coordinates: result.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          distance: result.distance,
          duration: result.duration,
          directions: (result.legs?.[0]?.steps ?? [])
            .filter(
              (step) =>
                step.distance > 0 &&
                step.maneuver?.location &&
                step.maneuver.type !== "depart" &&
                step.maneuver.type !== "arrive",
            )
            .map((step) => {
              const location = step.maneuver?.location as [number, number];
              return {
                instruction: routeInstruction(step),
                distance: step.distance,
                position: [location[1], location[0]] as Position,
                symbol: routeSymbol(step),
              };
            }),
        });
        setRouteMessage("");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRoute(null);
          setRouteMessage("Traseul nu a putut fi calculat. Încearcă alte locații.");
        }
      });

    return () => controller.abort();
  }, [origin, destination]);

  const closeOpenPanel = () => {
    clearHoverClose();
    if (panel === "layers") layersButton.current?.focus();
    if (routeOpen) {
      routeButton.current?.focus();
      setSearchResult(null);
      setFocusTarget(null);
      setOrigin(null);
      setDestination(null);
      setRoute(null);
      setRouteMessage("");
      setSelectedPlace(null);
      setSearchResetKey((value) => value + 1);
    }
    setPanel(null);
    setRouteOpen(false);
  };

  const currentLayer = layers[activeLayer];
  const filteredPlaces = places.filter((place) => selectedCategories.includes(place.category));

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  return (
    <section
      className="map-workspace"
      aria-label="Harta Chișinăului"
      onKeyDown={(event) => {
        if (event.key === "Escape" && (panel || routeOpen)) closeOpenPanel();
      }}
    >
      <MapContainer
        key={session}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        className="map-canvas"
      >
        <TileLayer attribution={currentLayer.attribution} url={currentLayer.url} />
        <ZoomControl position="bottomright" zoomInTitle="Mărește harta" zoomOutTitle="Micșorează harta" />
        <ViewController target={focusTarget ?? searchResult?.position ?? null} route={route} />
        {showPlaces
          ? filteredPlaces.map((place) => (
              <Marker
                key={place.id}
                position={place.position}
                icon={markerIcon(place.categoryColor)}
                eventHandlers={{
                  click: () => {
                    setSelectedPlace(place);
                    setFocusTarget(place.position);
                    setPanel(null);
                    setRouteOpen(false);
                  },
                }}
              >
                {selectedPlace?.id === place.id ? null : (
                  <Popup className="map-popup">
                    <article>
                      <p className="map-popup__status" style={{ color: statusMeta[place.status].color }}>
                        {statusMeta[place.status].label}
                      </p>
                      <h3>{place.name}</h3>
                      <p>{place.address}</p>
                      <p>{place.note}</p>
                      <p className="map-popup__score">
                        Scor accesibilitate: <strong>{scoreFor(place)}/100</strong>
                      </p>
                      <dl className="map-popup__features">
                        {accessibilityFeatures.map((feature) => (
                          <div key={feature.key}>
                            <dt>{feature.label}</dt>
                            <dd
                              className={
                                "map-popup__feature-value map-popup__feature-value--" +
                                place.accessibility[feature.key]
                              }
                            >
                              {accessibilityValueLabel[place.accessibility[feature.key]]}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  </Popup>
                )}
              </Marker>
            ))
          : null}
        {searchResult ? (
          <Marker position={searchResult.position} icon={pointIcon("search")}>
            <Popup className="map-popup">
              <article>
                <p className="map-popup__status" style={{ color: "#163b83" }}>
                  Locație găsită
                </p>
                <h3>{searchResult.label}</h3>
              </article>
            </Popup>
          </Marker>
        ) : null}
        {route ? (
          <>
            <Polyline positions={route.coordinates} pathOptions={{ color: "#fff", weight: 10, opacity: 0.92 }} />
            <Polyline positions={route.coordinates} pathOptions={{ color: "#163b83", weight: 6, opacity: 0.96 }} />
            {route.directions.map((direction, index) => (
              <Marker
                key={direction.position.join("-") + index}
                position={direction.position}
                icon={directionIcon(index)}
              >
                <Popup className="map-direction-popup">
                  <strong>{index + 1}. {direction.instruction}</strong>
                  <span>{formatDistance(direction.distance)}</span>
                </Popup>
              </Marker>
            ))}
          </>
        ) : null}
        {origin ? <Marker position={origin.position} icon={pointIcon("start")} /> : null}
        {destination ? <Marker position={destination.position} icon={pointIcon("end")} /> : null}
        <AccessibleParkingMarkers visible={travelMode === "driving"} />
      </MapContainer>

      <div className="map-floating-search">
        <MapSearch
          key={searchResetKey}
          onSelect={(location) => {
            const normalizedLabel = location.label.toLocaleLowerCase("ro");
            const matchingPlace = places.find((place) => {
              const normalizedName = place.name.toLocaleLowerCase("ro");
              return (
                normalizedLabel.includes(normalizedName) ||
                normalizedName.includes(normalizedLabel) ||
                place.aliases?.some((alias) => normalizedLabel.includes(alias))
              );
            });
            const selectedLocation = matchingPlace ? placeToLocation(matchingPlace) : location;
            setSearchResult(selectedLocation);
            setFocusTarget(selectedLocation.position);
            setDestination(selectedLocation);
            setRouteOpen(true);
            setPanel(null);
            setSelectedPlace(matchingPlace ?? null);
          }}
          onDirections={() => {
            clearHoverClose();
            setRouteOpen(true);
            setPanel(null);
          }}
          onPlaces={() => {
            clearHoverClose();
            setPanel((value) => (value === "places" ? null : "places"));
            setRouteOpen(false);
          }}
          onDirectionsHover={() => openOnHover("route")}
          onPlacesHover={() => openOnHover("places")}
          onControlLeave={scheduleHoverClose}
          routeButtonRef={routeButton}
          routeOpen={routeOpen}
        />
      </div>

      <button type="button" className="map-reset-button" onClick={resetMap} title="Resetează harta la Chișinău" aria-label="Resetează harta la Chișinău">
        <LocateFixed size={22} aria-hidden="true" />
      </button>

      <button
        ref={layersButton}
        type="button"
        className="map-layers-button"
        aria-expanded={panel === "layers"}
        aria-controls="map-layers"
        onClick={() => {
          clearHoverClose();
          setPanel(panel === "layers" ? null : "layers");
          setRouteOpen(false);
        }}
        onMouseEnter={() => openOnHover("layers")}
        onMouseLeave={scheduleHoverClose}
      >
        <Layers3 size={26} aria-hidden="true" />
        <span>Straturi</span>
      </button>

      {routeOpen ? (
        <section id="map-route" className="map-floating-panel map-floating-panel--route" aria-labelledby="route-title" onMouseEnter={clearHoverClose} onMouseLeave={clearHoverClose}>
          <div className="map-panel-heading map-route-panel__heading">
            <p id="route-title" className="map-route-panel__intro">Alege punctul de plecare, destinația și mijlocul de transport.</p>
            <button type="button" onClick={closeOpenPanel} aria-label="Închide direcțiile"><X size={20} /></button>
          </div>
          <div className="map-travel-modes" aria-label="Mod de deplasare">
            <button
              type="button"
              className={travelMode === "wheelchair" ? "is-active" : ""}
              aria-pressed={travelMode === "wheelchair"}
              onClick={() => setTravelMode("wheelchair")}
            >
              <Accessibility size={18} aria-hidden="true" /> Scaun rulant
            </button>
            <button
              type="button"
              className={travelMode === "transit" ? "is-active" : ""}
              aria-pressed={travelMode === "transit"}
              onClick={() => setTravelMode("transit")}
            >
              <Bus size={18} aria-hidden="true" /> Transport
            </button>
            <button
              type="button"
              className={travelMode === "driving" ? "is-active" : ""}
              aria-pressed={travelMode === "driving"}
              onClick={() => setTravelMode("driving")}
            >
              <Car size={18} aria-hidden="true" /> Mașină
            </button>
          </div>
          <div className="map-route-fields">
            <RouteLocationField
              id="route-origin"
              label="Plecare"
              kind="start"
              selected={origin}
              onSelect={setOrigin}
              onClear={() => {
                setOrigin(null);
                setRoute(null);
                setRouteMessage("");
              }}
            />
            <RouteLocationField
              id="route-destination"
              label="Destinație"
              kind="end"
              selected={destination}
              onSelect={setDestination}
              onClear={() => {
                setDestination(null);
                setRoute(null);
                setRouteMessage("");
              }}
            />
          </div>
          {route ? (
            <>
              <div className="map-route-summary" role="status">
                <strong>Traseu găsit</strong>
                <span>{formatDistance(route.distance)}</span>
                <span>{estimatedRouteDuration(route.distance, route.duration, travelMode)}</span>
              </div>
              {travelMode === "transit" ? (
                <div className="map-transit-guide">
                  <Bus size={20} aria-hidden="true" />
                  <div>
                    <strong>Transport public</strong>
                    <p>Urmează traseul până la stație, apoi alege un troleibuz sau autobuz spre destinație. Liniile exacte vor apărea după integrarea programului oficial de transport.</p>
                  </div>
                </div>
              ) : null}
              {travelMode === "driving" ? (
                <div className="map-parking-guide">
                  <span aria-hidden="true">P</span>
                  <p>Marcajele albastre P arată parcările accesibile găsite în OpenStreetMap. Apasă pe un marcaj pentru detalii.</p>
                </div>
              ) : null}
              <section className="map-directions" aria-labelledby="directions-title">
                <h3 id="directions-title">Direcții</h3>
                <ol>
                  <li className="map-directions__start">
                    <i aria-hidden="true">S</i>
                    <strong>Start: {origin?.label}</strong>
                    <span />
                  </li>
                  {route.directions.length
                    ? route.directions.map((direction, index) => (
                      <li key={index}>
                        <i aria-hidden="true">{direction.symbol}</i>
                        <strong>{index + 1}. {direction.instruction}</strong>
                        <span>{formatDistance(direction.distance)}</span>
                      </li>
                    ))
                    : null}
                  <li className="map-directions__end">
                    <i aria-hidden="true">●</i>
                    <strong>Ai ajuns: {destination?.label}</strong>
                    <span />
                  </li>
                </ol>
              </section>
            </>
          ) : (
            <p className="map-route-message" role="status">
              {routeMessage || "Selectează ambele locații pentru a calcula traseul."}
            </p>
          )}
        </section>
      ) : null}

      {panel === "layers" ? (
        <section id="map-layers" className="map-floating-panel map-floating-panel--layers" aria-labelledby="layers-title" onMouseEnter={clearHoverClose} onMouseLeave={scheduleHoverClose}>
          <div className="map-panel-heading">
            <h2 id="layers-title">Tipul hărții</h2>
            <button type="button" onClick={closeOpenPanel} aria-label="Închide straturile"><X size={20} /></button>
          </div>
          <div className="map-layer-options">
            {(Object.keys(layers) as BaseLayerKey[]).map((key) => {
              const Icon = key === "strazi" ? MapPinned : Satellite;
              return (
                <button
                  key={key}
                  type="button"
                  className={"map-layer-choice map-layer-choice--" + key}
                  aria-pressed={activeLayer === key}
                  title={layers[key].hint}
                  onClick={() => setActiveLayer(key)}
                >
                  <Icon size={28} aria-hidden="true" />
                  <span>{layers[key].label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {panel === "places" ? (
        <section id="map-places" className="map-floating-panel map-floating-panel--places" aria-labelledby="places-title" onMouseEnter={clearHoverClose} onMouseLeave={scheduleHoverClose}>
          <div className="map-panel-heading">
            <div>
              <h2 id="places-title">Locații</h2>
              <p>Filtrează punctele de pe hartă după categorie.</p>
            </div>
            <button type="button" onClick={closeOpenPanel} aria-label="Închide locațiile"><X size={20} /></button>
          </div>
          <div className="map-category-list" aria-label="Categorii de locații">
            {placeCategories.map((category) => {
              return (
                <label key={category.label} className="map-category-option">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.label)}
                    onChange={() => toggleCategory(category.label)}
                  />
                  <i style={{ background: category.color }} aria-hidden="true" />
                  <span>{category.label}</span>
                </label>
              );
            })}
          </div>
          <p className="map-places-count">
            Pe hartă: <strong>{filteredPlaces.length}</strong> locații
          </p>
        </section>
      ) : null}

      {selectedPlace ? (
        <section className="map-floating-panel map-floating-panel--place-details" aria-labelledby="place-details-title">
          <div className="map-panel-heading">
            <div>
              <p className="map-place-detail__category" style={{ color: selectedPlace.categoryColor }}>
                {selectedPlace.category}
              </p>
              <h2 id="place-details-title">{selectedPlace.name}</h2>
              <p>{selectedPlace.address}</p>
            </div>
            <button type="button" onClick={() => setSelectedPlace(null)} aria-label="Închide detaliile locației"><X size={20} /></button>
          </div>
          <div className="map-place-detail__summary">
            <span style={{ background: statusMeta[selectedPlace.status].color }} aria-hidden="true" />
            <strong>{statusMeta[selectedPlace.status].label}</strong>
            <b>{scoreFor(selectedPlace)}/100</b>
          </div>
          <p className="map-place-detail__note">{selectedPlace.note}</p>
          <dl className="map-place-detail__meta">
            <div><dt>Tip</dt><dd>{selectedPlace.category}</dd></div>
            <div><dt>Coordonate</dt><dd>{selectedPlace.position[0].toFixed(5)}, {selectedPlace.position[1].toFixed(5)}</dd></div>
          </dl>
          <h3>Accesibilitate</h3>
          <dl className="map-place-detail__features">
            {accessibilityFeatures.map((feature) => {
              const value = selectedPlace.accessibility[feature.key];
              return (
                <div key={feature.key}>
                  <dt>{feature.label}</dt>
                  <dd className={"is-" + value}>{accessibilityValueLabel[value]}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ) : null}
    </section>
  );
}
