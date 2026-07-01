import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Play, Pause, RefreshCw, Layers } from "lucide-react";

interface WeatherMapProps {
  lat: number;
  lon: number;
  isDarkMode: boolean;
}

export default function WeatherMap({ lat, lon, isDarkMode }: WeatherMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [radarTimestamps, setRadarTimestamps] = useState<number[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [mapType, setMapType] = useState<"radar" | "satellite">("radar");
  const [loadingRadar, setLoadingRadar] = useState<boolean>(false);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch RainViewer radar timestamps for dynamic mapping
  useEffect(() => {
    let active = true;
    const fetchTimestamps = async () => {
      setLoadingRadar(true);
      try {
        const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (response.ok && active) {
          const data = await response.json();
          // RainViewer provides past, present, and forecast timestamps
          // Let's filter for past and present (usually 10-12 timestamps)
          const radarFrames = data.radar.past.map((frame: any) => frame.time);
          if (data.radar.nowcast && data.radar.nowcast.length > 0) {
            radarFrames.push(...data.radar.nowcast.map((frame: any) => frame.time));
          }
          if (radarFrames.length > 0) {
            setRadarTimestamps(radarFrames);
            setCurrentFrameIndex(radarFrames.length - 1); // Default to current time
          }
        }
      } catch (err) {
        console.error("Failed to load radar frame timestamps:", err);
      } finally {
        if (active) setLoadingRadar(false);
      }
    };

    fetchTimestamps();
    return () => {
      active = false;
    };
  }, []);

  // Initialize and update the map base
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 8,
      zoomControl: false, // Custom position or disabled
      attributionControl: false,
    });

    mapRef.current = map;

    // Add zoom control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Only on mount

  // Sync map center & theme & markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Set view center
    map.setView([lat, lon], 8);

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Add user/location marker
    const customIcon = L.divIcon({
      className: "custom-marker-icon",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute h-5 w-5 animate-ping rounded-full bg-blue-500 opacity-75"></div>
          <div class="relative h-3 w-3 rounded-full bg-blue-600 border border-white"></div>
        </div>
      `,
    });

    markerRef.current = L.marker([lat, lon], { icon: customIcon }).addTo(map);

    // Update tile base depending on Dark/Light Mode
    // CartoDB Dark Matter vs Positron base maps are gorgeous and clean
    const baseTileUrl = isDarkMode
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    // Clear existing base maps
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer && layer !== radarLayerRef.current) {
        map.removeLayer(layer);
      }
    });

    L.tileLayer(baseTileUrl, {
      maxZoom: 19,
    }).addTo(map);

  }, [lat, lon, isDarkMode]);

  // Handle Radar Overlay Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || radarTimestamps.length === 0 || currentFrameIndex === -1) return;

    const activeTimestamp = radarTimestamps[currentFrameIndex];

    // Remove existing radar layer
    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
    }

    // Build RainViewer precipitation tile URL
    // {ts} is timestamp, {color} is palette ID (e.g. 2 for standard rain-radar, 1 for universal)
    const radarUrl = `https://tilecache.rainviewer.com/v2/radar/${activeTimestamp}/256/{z}/{x}/{y}/2/1_1.png`;

    // satellite overlay option if requested
    const cloudUrl = `https://tilecache.rainviewer.com/v2/satellite/${activeTimestamp}/256/{z}/{x}/{y}/2/1_1.png`;

    const activeOverlayUrl = mapType === "radar" ? radarUrl : cloudUrl;

    radarLayerRef.current = L.tileLayer(activeOverlayUrl, {
      opacity: 0.75,
      zIndex: 100,
    }).addTo(map);

  }, [currentFrameIndex, radarTimestamps, mapType]);

  // Handle Playback Animation Loops
  useEffect(() => {
    if (isPlaying && radarTimestamps.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prevIndex) => {
          if (prevIndex >= radarTimestamps.length - 1) {
            return 0; // Loop back
          }
          return prevIndex + 1;
        });
      }, 1000); // 1-second interval per frame
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, radarTimestamps]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const getFormattedTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div id="radar-map-widget" className="relative w-full h-[320px] md:h-[400px] rounded-[32px] overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-800/50 bg-slate-100 dark:bg-slate-900 transition-colors">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating map control HUD */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap gap-2 items-center justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          {/* Radar vs Cloud Satellite type selection */}
          <button
            onClick={() => setMapType(mapType === "radar" ? "satellite" : "radar")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 shadow backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98] transition-all hover:border-cyan-500/50"
            id="map-layer-selector"
          >
            <Layers className="h-3.5 w-3.5 text-cyan-500" />
            {mapType === "radar" ? "Weather Radar" : "Cloud Satellite"}
          </button>
        </div>

        {radarTimestamps.length > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow backdrop-blur-sm text-slate-800 dark:text-slate-100 text-[10px] uppercase font-bold tracking-wider pointer-events-auto">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>
              {mapType === "radar" ? "Radar Live:" : "Satellite Live:"}{" "}
              <strong className="font-black text-slate-900 dark:text-white">
                {getFormattedTime(radarTimestamps[currentFrameIndex])}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Playback Controls Overlay at bottom left */}
      {radarTimestamps.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-950/90 shadow-md backdrop-blur-md border border-slate-200 dark:border-slate-800">
          <button
            onClick={togglePlayback}
            className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow hover:scale-[1.03] active:scale-[0.97] transition-all font-black"
            aria-label={isPlaying ? "Pause Radar Animation" : "Play Radar Animation"}
            id="radar-play-button"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2 px-1">
            <span className="text-[9px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500">
              Timeline
            </span>
            <input
              type="range"
              min="0"
              max={radarTimestamps.length - 1}
              value={currentFrameIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentFrameIndex(parseInt(e.target.value));
              }}
              className="w-24 md:w-36 accent-cyan-500 cursor-pointer h-1 rounded bg-slate-200 dark:bg-slate-800"
              id="radar-timeline-slider"
            />
          </div>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentFrameIndex(radarTimestamps.length - 1);
            }}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
            title="Reset to Present"
            id="radar-reset-button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loadingRadar && (
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center z-20">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow">
            <div className="h-3.5 w-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] uppercase text-slate-700 dark:text-slate-300 font-bold tracking-wider">Syncing radar...</span>
          </div>
        </div>
      )}
    </div>
  );
}
