import React, { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Wind,
  Droplets,
  Compass,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  CloudSun,
  AlertCircle,
  TrendingUp,
  Map,
  Sparkles,
  RefreshCw,
  Clock,
} from "lucide-react";
import { WeatherData } from "./types";
import LocationSelector from "./components/LocationSelector";
import WeatherIllustration from "./components/WeatherIllustration";
import HourlyForecastChart from "./components/HourlyForecastChart";
import WeatherMap from "./components/WeatherMap";
import AIWeatherAdvisor from "./components/AIWeatherAdvisor";

// Mapping icons for rendering
const WeatherIconMap: Record<string, React.ComponentType<any>> = {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  CloudSun,
  Wind,
  Droplets,
  Compass,
};

function renderWeatherIcon(iconName: string, className = "h-5 w-5") {
  const IconComponent = WeatherIconMap[iconName] || Cloud;
  return <IconComponent className={className} />;
}

export default function App() {
  const [lat, setLat] = useState<number>(40.7128); // New York default
  const [lon, setLon] = useState<number>(-74.006);
  const [displayName, setDisplayName] = useState<string>("New York, USA");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // default dark, as shown in picture

  // Dark/Light Theme Handler
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Geolocation trigger on mount to improve UX immediately
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLon(position.coords.longitude);
          setDisplayName("Detected Location");
        },
        (err) => {
          console.log("Auto geolocation bypassed on mount:", err.message);
          // Standard default New York is used silently
        }
      );
    }
  }, []);

  // Fetch Weather Details
  const fetchWeather = async (targetLat: number, targetLon: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/weather?lat=${targetLat}&lon=${targetLon}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load meteorological forecast data.");
      }
      const data = await response.json();
      setWeatherData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to reach forecast servers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(lat, lon);
  }, [lat, lon]);

  const handleLocationSelect = (selectedLat: number, selectedLon: number, name: string) => {
    setLat(selectedLat);
    setLon(selectedLon);
    setDisplayName(name);
  };

  const getDayOfWeekString = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
    return new Date().toLocaleDateString([], options);
  };

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} transition-colors duration-300 pb-12`}>
      {/* Absolute background accent meshes */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

      {/* Main Header / Navigation Container */}
      <header className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/40 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <div className="w-4 h-4 bg-slate-950 rounded-full"></div>
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter uppercase text-slate-800 dark:text-slate-100 block">SkyCast</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] block -mt-1">India</span>
          </div>
        </div>

        {/* Global Location Autocomplete Selector */}
        <LocationSelector onLocationSelect={handleLocationSelect} isLoading={isLoading} />

        {/* Utility bar for Theme and Reload triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchWeather(lat, lon)}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-cyan-500/50 active:scale-95 transition-all disabled:opacity-50"
            title="Refresh weather data"
            id="refresh-weather-button"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 dark:text-slate-300 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-cyan-500/50 active:scale-95 transition-all text-slate-600 dark:text-slate-300"
            aria-label={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
            id="theme-toggle-button"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 mt-6 relative z-10">
        {/* Error Notification banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200/70 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/20 text-red-700 dark:text-red-400 flex items-center gap-3 shadow-sm animate-in fade-in duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <button
              onClick={() => fetchWeather(lat, lon)}
              className="px-3.5 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !weatherData ? (
          /* Large beautiful centered loading panel */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
              <Compass className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-500 animate-pulse" />
            </div>
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mt-6 tracking-tight">
              Loading atmospheric forecasts...
            </h2>
            <p className="text-xs text-slate-400 mt-1">Acquiring live meteorological radar feed</p>
          </div>
        ) : weatherData ? (
          /* Weather panels bento grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / CENTER COLUMN: Current Details & Hourly Splines & Radar Maps */}
            <div className="lg:col-span-8 space-y-6">
              {/* CURRENT WEATHER HERO BOX */}
              <div id="current-weather-hero" className="relative p-6 md:p-8 rounded-[32px] bg-slate-100/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40 overflow-hidden shadow-sm transition-colors">
                {/* Floating Location indicator and date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800/30 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                      {weatherData.city || displayName}
                      {weatherData.country ? `, ${weatherData.country}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                    <Clock className="h-3.5 w-3.5 text-cyan-500" />
                    <span>{getDayOfWeekString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Visual Temp Conditions */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-start">
                        <span className="text-7xl md:text-[120px] font-black leading-[0.85] tracking-tighter text-slate-900 dark:text-white">
                          {weatherData.current.temp}<span className="text-cyan-500">°</span>
                        </span>
                        <span className="text-2xl md:text-3xl font-black text-cyan-500 mt-2 ml-1">
                          C
                        </span>
                      </div>
                      <p className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-100 capitalize mt-2">
                        {weatherData.current.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
                        <span>Feels like {weatherData.current.feels_like}°C</span>
                      </div>
                    </div>

                    {/* Meteorological indicators row */}
                    <div className="grid grid-cols-3 gap-3.5 pt-5 border-t border-slate-200/50 dark:border-slate-800/30">
                      <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1.5">Wind</p>
                        <p className="text-lg font-black italic text-slate-800 dark:text-white">
                          {weatherData.current.wind_speed}
                          <span className="text-[10px] not-italic font-bold uppercase text-slate-400 ml-0.5">
                            {weatherData.provider === "openweathermap" ? "m/s" : "km/h"}
                          </span>
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1.5">Humidity</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{weatherData.current.humidity}%</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1.5">Pressure</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">
                          {weatherData.current.pressure}
                          <span className="text-[9px] font-bold text-slate-400 ml-0.5">hPa</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gorgeous weather 3D illustration cloud block */}
                  <div className="flex justify-center relative">
                    <div className="absolute inset-0 bg-cyan-500/5 dark:bg-cyan-400/5 blur-3xl rounded-full" />
                    <WeatherIllustration condition={weatherData.current.description} className="relative z-10 hover:scale-105 transition-all duration-500" />
                  </div>
                </div>
              </div>

              {/* HOURLY TEMPERATURE SPLINE CHART */}
              <HourlyForecastChart hourlyData={weatherData.hourly} isDarkMode={isDarkMode} />

              {/* INTERACTIVE METEOROLOGICAL RADAR MAP */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Map className="h-4.5 w-4.5 text-cyan-500" />
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Interactive Weather Map
                  </h3>
                  <span className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/10 ml-1">
                    Radar Overlay
                  </span>
                </div>
                <WeatherMap lat={lat} lon={lon} isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* RIGHT SIDE PANEL: 6-Day Weekly list & Gemini AI Advisor */}
            <div className="lg:col-span-4 space-y-6">
              {/* GEMINI AI ADVISORY */}
              <AIWeatherAdvisor weatherData={weatherData} />

              {/* 6-DAY WEEKLY FORECAST WIDGET */}
              <div id="weekly-forecast-widget" className="rounded-[32px] p-6 bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-colors">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50 dark:border-slate-800/30">
                  <TrendingUp className="h-4 w-4 text-cyan-500" />
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    6-Day Forecast
                  </h3>
                </div>

                <div className="space-y-4">
                  {weatherData.daily.map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 border-b border-slate-200/40 dark:border-slate-800/20 last:border-0"
                    >
                      {/* Day description name */}
                      <div className="w-28">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{day.day_name}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none mt-1 truncate">
                          {day.description}
                        </p>
                      </div>

                      {/* Animated vector style conditions indicator */}
                      <div className="flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-cyan-600 dark:text-cyan-400 border border-transparent dark:border-slate-800/30">
                        {renderWeatherIcon(day.icon, "h-4 w-4")}
                      </div>

                      {/* Min/Max Temperature splits */}
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {day.temp_max}°
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          {day.temp_min}°
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Global Footer */}
      <footer className="max-w-7xl mx-auto px-4 mt-12 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-t border-slate-200/40 dark:border-slate-800/30 pt-6">
        <span>© {new Date().getFullYear()} SkyCast Weather System</span>
        <span className="mx-2">•</span>
        <span>Secure server-side API proxy</span>
      </footer>
    </div>
  );
}
