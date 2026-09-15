import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { filterPlaces, normalizeSearch } from "../../utils/accessibility";
import { searchMapLocations } from "../../services/locationSearch";
import type { MapPlace, Position } from "../../types/place";

export type LocationOption = {
  label: string;
  position: Position;
  placeId?: string;
  externalId?: string;
  detail?: string;
};
export function LocationSearch({
  label,
  places,
  value,
  onSelect,
  onClear,
  placeholder,
  autoFocus = false,
}: {
  label: string;
  places: MapPlace[];
  value: LocationOption | null;
  onSelect: (option: LocationOption) => void;
  onClear: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [previousValue, setPreviousValue] = useState(value);
  const [remoteOptions, setRemoteOptions] = useState<LocationOption[]>([]);
  const [searchingOnline, setSearchingOnline] = useState(false);
  if (previousValue !== value) {
    setPreviousValue(value);
    setText(value?.label ?? "");
  }
  const id = useId();
  useEffect(() => {
    const query = text.trim();
    if (query.length < 2) {
      setRemoteOptions([]);
      setSearchingOnline(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchingOnline(true);
      void searchMapLocations(query, controller.signal)
        .then(setRemoteOptions)
        .catch(() => {
          if (!controller.signal.aborted) setRemoteOptions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchingOnline(false);
        });
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [text]);
  const localOptions: LocationOption[] = filterPlaces(places, { search: text }).map(
    (place) => ({
      label: place.name,
      position: place.position,
      placeId: place.id,
      detail: place.address,
    }),
  );
  const options = [...localOptions, ...remoteOptions]
    .filter(
      (option, index, all) =>
        all.findIndex(
          (candidate) =>
            normalizeSearch(candidate.label) === normalizeSearch(option.label) &&
            candidate.position[0] === option.position[0] &&
            candidate.position[1] === option.position[1],
        ) === index,
    )
    .slice(0, 7);
  const choose = (option: LocationOption) => {
    setText(option.label);
    setOpen(false);
    setActive(-1);
    onSelect(option);
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) =>
        event.key === "ArrowDown"
          ? Math.min(index + 1, options.length - 1)
          : Math.max(0, index - 1),
      );
    }
    if (event.key === "Enter" && options.length) {
      event.preventDefault();
      choose(options[Math.max(0, active)]);
    }
  };
  return (
    <div
      className="location-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Search size={17} className="location-search-icon" />
      <Input
        id={id}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 ? `${id}-${active}` : undefined
        }
        placeholder={placeholder ?? label}
        value={text}
        onFocus={() => {
          setOpen(true);
          setActive(-1);
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(-1);
          if (value) {
            setPreviousValue(null);
            onClear();
          }
        }}
        onKeyDown={keyDown}
      />
      {text && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="location-search-clear"
          aria-label={`Șterge ${label.toLowerCase()}`}
          onClick={() => {
            setText("");
            onClear();
            setOpen(false);
          }}
        >
          <X />
        </Button>
      )}
      {open && (
        <div
          className="location-results"
          role="listbox"
          id={`${id}-list`}
          aria-label={`Sugestii: ${label}`}
        >
          {options.length ? (
            options.map((option, index) => (
              <button
                type="button"
                role="option"
                aria-selected={active === index}
                id={`${id}-${index}`}
                key={option.externalId ?? option.placeId ?? `${option.label}-${option.position.join("-")}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <MapPin size={16} />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail ?? "Chișinău"}</small>
                </span>
              </button>
            ))
          ) : (
            <p>Nicio locație găsită în catalog.</p>
          )}
          <small className="location-search-source">
            {searchingOnline
              ? "Se caută locații online…"
              : "Rezultatele includ locații din OpenStreetMap"}
          </small>
        </div>
      )}
    </div>
  );
}
