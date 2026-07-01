import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Navigation, X, Loader2 } from "lucide-react";

interface Suggestion {
  id: number;
  name: string;
  displayName: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
}

interface LocationSelectorProps {
  onLocationSelect: (lat: number, lon: number, cityName: string) => void;
  isLoading: boolean;
}

export default function LocationSelector({ onLocationSelect, isLoading }: LocationSelectorProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search predictions with debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Failed to query suggestions:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Request browser geolocation coordinates
  const handleGeolocation = () => {
    setGeoLocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setGeoLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationSelect(latitude, longitude, "Current Location");
        setGeoLocating(false);
      },
      (error) => {
        console.warn("Geolocation warning:", error);
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please allow location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out.";
        }
        setGeoError(errorMsg);
        setGeoLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSelect = (item: Suggestion) => {
    onLocationSelect(item.lat, item.lon, `${item.name}, ${item.country}`);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div id="location-selector-widget" className="relative w-full max-w-lg" ref={dropdownRef}>
      <div className="flex gap-2">
        {/* Search Input Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a city..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-sm font-semibold border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500/50 transition-colors placeholder-slate-500"
            id="city-search-input"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSuggestions([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Locate Me Geolocation Button */}
        <button
          onClick={handleGeolocation}
          disabled={geoLocating || isLoading}
          className="flex items-center gap-1.5 px-4 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50"
          title="Use Geolocation"
          id="geolocation-button"
        >
          {geoLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Locate</span>
        </button>
      </div>

      {/* Autocomplete suggestions dropdown panel */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xl backdrop-blur-md overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="py-1.5">
            {suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/85 dark:hover:bg-slate-800/85 active:bg-slate-200 dark:active:bg-slate-700 transition-all"
              >
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <div className="flex-1 truncate">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.name}
                  </span>
                  {item.state && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      , {item.state}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">
                    ({item.country})
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Geolocation Banners / Notifications */}
      {geoError && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-medium z-40 flex justify-between items-center shadow-lg">
          <span>{geoError}</span>
          <button
            onClick={() => setGeoError(null)}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
