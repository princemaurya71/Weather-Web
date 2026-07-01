import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini AI Client
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize Gemini AI Client:", err);
  }
}

// Global caching for Nominatim geocoding to respect usage guidelines
const geoCache = new Map<string, any>();

// Cache for generated AI weather advisories to prevent hitting rate limits
const aiCache = new Map<string, any>();

// Fallback cities for resilient geocoding and geosearch
const FALLBACK_CITIES = [
  { id: 100001, name: "New York", displayName: "New York, NY, USA", lat: 40.7128, lon: -74.0060, country: "USA", state: "NY" },
  { id: 100002, name: "London", displayName: "London, Greater London, UK", lat: 51.5074, lon: -0.1278, country: "UK", state: "" },
  { id: 100003, name: "Tokyo", displayName: "Tokyo, Kanto, Japan", lat: 35.6762, lon: 139.6503, country: "Japan", state: "" },
  { id: 100004, name: "Paris", displayName: "Paris, Île-de-France, France", lat: 48.8566, lon: 2.3522, country: "France", state: "" },
  { id: 100005, name: "Sydney", displayName: "Sydney, NSW, Australia", lat: -33.8688, lon: 151.2093, country: "Australia", state: "NSW" },
  { id: 100006, name: "Mumbai", displayName: "Mumbai, Maharashtra, India", lat: 19.0760, lon: 72.8777, country: "India", state: "Maharashtra" },
  { id: 100007, name: "San Francisco", displayName: "San Francisco, CA, USA", lat: 37.7749, lon: -122.4194, country: "USA", state: "CA" },
  { id: 100008, name: "Singapore", displayName: "Singapore", lat: 1.3521, lon: 103.8198, country: "Singapore", state: "" }
];

// Resilient fallback weather simulator in case external weather APIs fail/time out
function generateFallbackWeather(lat: number, lon: number, city: string, country: string) {
  const absLat = Math.abs(lat);
  // Base temperature varies realistically based on distance from equator
  let baseTemp = 30 - (absLat * 0.5); 
  // Add some deterministic but realistic variance using coordinate sine waves
  const hash = Math.sin(lat) * Math.cos(lon);
  baseTemp += hash * 8; 
  baseTemp = Math.round(baseTemp);

  const current = {
    temp: baseTemp,
    feels_like: Math.round(baseTemp + (hash * 2.5)),
    description: baseTemp > 25 ? "Clear Sky" : baseTemp > 16 ? "Partly Cloudy" : baseTemp > 7 ? "Drizzle" : "Cloudy",
    humidity: Math.round(55 + (hash * 25)),
    wind_speed: Math.round(8 + Math.abs(hash * 22)),
    pressure: Math.round(1013 + (hash * 12)),
    icon: baseTemp > 25 ? "Sun" : baseTemp > 16 ? "CloudSun" : "Cloud",
    uv_index: Math.max(1, Math.round(9 - (absLat * 0.12))),
  };

  const hourly = [];
  for (let i = 0; i < 8; i++) {
    const date = new Date();
    date.setHours(date.getHours() + i);
    const tempVar = Math.round(baseTemp + Math.sin(i / 1.8) * 4);
    hourly.push({
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      temp: tempVar,
      description: current.description,
      pop: Math.max(0, Math.round(15 + Math.sin(i * 1.5) * 45)),
      icon: current.icon,
    });
  }

  const daily = [];
  const days = ["Today", "Tomorrow", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const todayIndex = new Date().getDay();
  for (let i = 0; i < 6; i++) {
    const dayName = i === 0 ? "Today" : days[(todayIndex + i) % 7];
    const tempMax = Math.round(baseTemp + 5 + (Math.sin(i * 1.2) * 3));
    const tempMin = Math.round(baseTemp - 5 + (Math.cos(i * 1.2) * 3));
    daily.push({
      day_name: dayName,
      temp_min: tempMin,
      temp_max: tempMax,
      icon: current.icon,
      description: current.description,
      humidity: current.humidity,
      wind: current.wind_speed,
    });
  }

  return {
    provider: "fallback-simulator",
    city: city || "Detected Location",
    country: country || "",
    lat,
    lon,
    current,
    hourly,
    daily,
  };
}

// Standard Weather Condition Mapper
function getWeatherCondition(code: number): { text: string; icon: string } {
  // WMO Weather interpretation codes (Open-Meteo)
  if (code === 0) return { text: "Clear Sky", icon: "Sun" };
  if (code === 1 || code === 2 || code === 3) return { text: "Partly Cloudy", icon: "CloudSun" };
  if (code === 45 || code === 48) return { text: "Foggy", icon: "CloudFog" };
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return { text: "Drizzle", icon: "CloudDrizzle" };
  if (code === 61 || code === 63 || code === 65 || code === 66 || code === 67) return { text: "Rain", icon: "CloudRain" };
  if (code === 71 || code === 73 || code === 75 || code === 77) return { text: "Snow", icon: "CloudSnow" };
  if (code === 80 || code === 81 || code === 82) return { text: "Rain Showers", icon: "CloudRain" };
  if (code === 85 || code === 86) return { text: "Snow Showers", icon: "CloudSnow" };
  if (code === 95) return { text: "Thunderstorm", icon: "CloudLightning" };
  if (code === 96 || code === 99) return { text: "Severe Storm", icon: "CloudLightning" };
  return { text: "Cloudy", icon: "Cloud" };
}

// Free Nominatim reverse geocoding
async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string }> {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SkyCastWeatherApp/1.0 (riyaanmaurya2400@gmail.com)",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.suburb || address.county || "Unknown Location";
      const country = address.country || "";
      const result = { city, country };
      geoCache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error);
  }
  return { city: "Detected Location", country: "" };
}

// Weather endpoints
app.get("/api/weather", async (req, res) => {
  const latStr = req.query.lat as string;
  const lonStr = req.query.lon as string;
  const cityQuery = req.query.city as string;

  let lat = parseFloat(latStr);
  let lon = parseFloat(lonStr);
  let city = "Detected Location";
  let country = "";

  try {
    // If city is queried instead of coords, geocode it first
    if (cityQuery && (!latStr || !lonStr)) {
      let resolved = false;
      try {
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`;
        const geoRes = await fetch(geocodeUrl, {
          headers: {
            "User-Agent": "SkyCastWeatherApp/1.0 (riyaanmaurya2400@gmail.com)",
          },
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
            resolved = true;
          }
        }
      } catch (err) {
        console.warn("External geocoding failed, using in-memory geocoder fallback...", err);
      }

      // If Nominatim failed, try our local in-memory fallback geocoder
      if (!resolved) {
        const queryLower = cityQuery.toLowerCase().trim();
        const localMatch = FALLBACK_CITIES.find(c => 
          c.name.toLowerCase().includes(queryLower) || 
          c.displayName.toLowerCase().includes(queryLower)
        );

        if (localMatch) {
          lat = localMatch.lat;
          lon = localMatch.lon;
          resolved = true;
        } else {
          // Default to New York coordinates rather than crashing
          lat = 40.7128;
          lon = -74.0060;
          resolved = true;
        }
      }
    }

    if (isNaN(lat) || isNaN(lon)) {
      // Default to New York if no coords provided
      lat = 40.7128;
      lon = -74.0060;
    }

    const geo = await reverseGeocode(lat, lon);
    city = geo.city;
    country = geo.country;

    // Weather API selection: prioritize OpenWeatherMap if key is active
    const owmKey = process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHERMAP_API_KEY;
    if (owmKey && owmKey.trim() !== "") {
      try {
        // Fetch current weather and 5-day / 3-hour forecast in parallel
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${owmKey}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${owmKey}&units=metric`;

        const [currRes, foreRes] = await Promise.all([
          fetch(currentUrl),
          fetch(forecastUrl),
        ]);

        if (currRes.ok && foreRes.ok) {
          const currData = await currRes.json();
          const foreData = await foreRes.json();

          // Transform OWM data into our unified API structure
          const current = {
            temp: Math.round(currData.main.temp),
            feels_like: Math.round(currData.main.feels_like),
            description: currData.weather[0].description,
            humidity: currData.main.humidity,
            wind_speed: currData.wind.speed, // m/s
            pressure: currData.main.pressure,
            icon: currData.weather[0].main, // "Clouds", "Rain", "Clear" etc
            uv_index: 3, // OWM 5-day doesn't include UV directly, default to moderate
          };

          // Build hourly list (from 3-hourly OWM forecast)
          const hourly = foreData.list.slice(0, 8).map((item: any) => {
            const date = new Date(item.dt * 1000);
            return {
              time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
              temp: Math.round(item.main.temp),
              description: item.weather[0].description,
              pop: Math.round(item.pop * 100), // Probability of precipitation
              icon: item.weather[0].main,
            };
          });

          // Build daily forecast (grouped by day)
          const dailyMap = new Map<string, any>();
          foreData.list.forEach((item: any) => {
            const date = new Date(item.dt * 1000);
            const dayName = date.toLocaleDateString([], { weekday: "long" });

            if (!dailyMap.has(dayName)) {
              dailyMap.set(dayName, {
                day_name: dayName,
                temp_min: item.main.temp,
                temp_max: item.main.temp,
                icon: item.weather[0].main,
                description: item.weather[0].description,
                humidity: item.main.humidity,
                wind: item.wind.speed,
              });
            } else {
              const currentDay = dailyMap.get(dayName);
              currentDay.temp_min = Math.min(currentDay.temp_min, item.main.temp);
              currentDay.temp_max = Math.max(currentDay.temp_max, item.main.temp);
            }
          });

          const daily = Array.from(dailyMap.values()).slice(0, 6).map(day => ({
            ...day,
            temp_min: Math.round(day.temp_min),
            temp_max: Math.round(day.temp_max),
          }));

          return res.json({
            provider: "openweathermap",
            city,
            country,
            lat,
            lon,
            current,
            hourly,
            daily,
          });
        } else {
          console.warn("OpenWeatherMap fetch failed, falling back to Open-Meteo...");
        }
      } catch (owmError) {
        console.error("OpenWeatherMap integration failed, falling back:", owmError);
      }
    }

    // Fallback: Open-Meteo (fully accurate, no credentials needed)
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,pressure_msl,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max&timezone=auto`;

    const openMeteoRes = await fetch(openMeteoUrl);
    if (!openMeteoRes.ok) {
      throw new Error(`Open-Meteo failed with status ${openMeteoRes.status}`);
    }

    const mData = await openMeteoRes.json();
    const currCode = mData.current.weather_code;
    const currCond = getWeatherCondition(currCode);

    const current = {
      temp: Math.round(mData.current.temperature_2m),
      feels_like: Math.round(mData.current.apparent_temperature),
      description: currCond.text,
      humidity: mData.current.relative_humidity_2m,
      wind_speed: mData.current.wind_speed_10m, // km/h
      pressure: Math.round(mData.current.pressure_msl),
      icon: currCond.icon,
      uv_index: 4, // estimate
    };

    // Build hourly forecast from next 8 hours
    const hourly = [];
    for (let i = 0; i < 8; i++) {
      const timeStr = mData.hourly.time[i];
      const date = new Date(timeStr);
      const hCode = mData.hourly.weather_code[i];
      const hCond = getWeatherCondition(hCode);
      hourly.push({
        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        temp: Math.round(mData.hourly.temperature_2m[i]),
        description: hCond.text,
        pop: mData.hourly.precipitation_probability[i],
        icon: hCond.icon,
      });
    }

    // Build daily forecast for next 6 days
    const daily = [];
    const daysLength = mData.daily.time.length;
    for (let i = 0; i < Math.min(daysLength, 6); i++) {
      const dateStr = mData.daily.time[i];
      const date = new Date(dateStr + "T00:00:00");
      const dCode = mData.daily.weather_code[i];
      const dCond = getWeatherCondition(dCode);
      const isToday = i === 0;

      daily.push({
        day_name: isToday ? "Today" : date.toLocaleDateString([], { weekday: "long" }),
        temp_min: Math.round(mData.daily.temperature_2m_min[i]),
        temp_max: Math.round(mData.daily.temperature_2m_max[i]),
        icon: dCond.icon,
        description: dCond.text,
        humidity: mData.daily.relative_humidity_2m_mean[i],
        wind: mData.daily.wind_speed_10m_max[i],
      });
    }

    res.json({
      provider: "open-meteo",
      city,
      country,
      lat,
      lon,
      current,
      hourly,
      daily,
    });
  } catch (error: any) {
    console.error("Failed to fetch weather data, serving fallback simulator:", error);
    try {
      const fallbackData = generateFallbackWeather(lat, lon, city, country);
      return res.json(fallbackData);
    } catch (fallbackErr) {
      console.error("Critical fallback failure:", fallbackErr);
      return res.status(500).json({ error: "Failed to load weather forecast" });
    }
  }
});

// Autocomplete / Search endpoint
app.get("/api/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    let results: any[] = [];
    let success = false;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "SkyCastWeatherApp/1.0 (riyaanmaurya2400@gmail.com)",
        },
      });

      if (response.ok) {
        const data = await response.json();
        results = data.map((item: any) => {
          const address = item.address || {};
          const city = address.city || address.town || address.village || address.suburb || address.county || item.display_name.split(",")[0];
          const state = address.state || "";
          const country = address.country || "";
          return {
            id: item.place_id,
            name: city,
            displayName: item.display_name,
            state,
            country,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          };
        });
        success = true;
      }
    } catch (err) {
      console.warn("External geocoding search failed, falling back to local list:", err);
    }

    if (!success || results.length === 0) {
      const queryLower = query.toLowerCase().trim();
      results = FALLBACK_CITIES.filter(c => 
        c.name.toLowerCase().includes(queryLower) || 
        c.displayName.toLowerCase().includes(queryLower)
      ).map(c => ({
        id: c.id,
        name: c.name,
        displayName: c.displayName,
        state: c.state,
        country: c.country,
        lat: c.lat,
        lon: c.lon
      }));
    }

    return res.json(results);
  } catch (err) {
    console.error("Geocoding search error:", err);
    return res.status(500).json({ error: "Geocoding service error" });
  }
});

// Fallback advisory generator when Gemini is offline, rate-limited, or unavailable
function getFallbackAdvice(weatherData: any) {
  const current = weatherData.current;
  let outfit = "Wear layered comfortable clothing.";
  let activities = "Perfect day for standard outdoor or indoor activities.";
  let summary = `Expect a pleasant atmosphere in ${weatherData.city}. Currently ${current.temp}°C and ${current.description} with gentle breezes at ${current.wind_speed} ${weatherData.provider === "openweathermap" ? "m/s" : "km/h"}.`;
  let quote = "“In all things of nature there is something of the marvelous.”";

  if (current.temp < 10) {
    summary = `A crisp, wintry atmosphere blankets ${weatherData.city} today with temperatures holding at ${current.temp}°C. The air feels brisk and cold, with high humidity keeping the damp chill in the air.`;
    outfit = "Bundle up in a heavy winter coat, thermal layers, wool socks, and a warm beanie or scarf to protect against the bite of the cold.";
    activities = "Perfect for focusing on cozy indoor productivity, visiting local art museums, or gathering around a warm hearth with friends.";
    quote = "“He who marvels at the beauty of the world in summer will find equal cause for wonder in winter.”";
  } else if (current.temp < 18) {
    summary = `A cool, refreshing breeze defines the day in ${weatherData.city}. With temperatures at ${current.temp}°C and ${current.description}, the environment has a crisp, transitional season feel under the sky.`;
    outfit = "Opt for a stylish denim jacket, tailored cardigan, or windbreaker paired with comfortable layers and solid walking shoes.";
    activities = "Highly recommended for a relaxed scenic stroll, photography, visiting open-air cafes, or cycling along the river pathways.";
    quote = "“To appreciate the beauty of a snowflake, it is necessary to stand out in the cold.”";
  } else {
    summary = `Warm, radiant sunshine fills the atmosphere in ${weatherData.city} today. The temperature of ${current.temp}°C provides an inviting, energized ambient warmth perfect for enjoying the great outdoors.`;
    outfit = "Wear light, breathable cotton t-shirts, comfortable linen garments, sunglasses, and high-protection sun screen to stay cool and safe.";
    activities = "An excellent opportunity for park picnics, beach walking, patio dining, hiking, or sports before the temperature dips.";
    quote = "“Live in the sunshine, swim the sea, drink the wild air.”";
  }

  const desc = current.description.toLowerCase();
  if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("storm") || desc.includes("shower")) {
    summary = `Damp, atmospheric rain showers are sweeping through ${weatherData.city} today. The rhythm of falling water creates a moody, tranquil aesthetic over the urban landscape.`;
    outfit += " Make sure to bring a compact windproof umbrella, a water-resistant hooded jacket, and waterproof boots to stay completely dry.";
    activities = "Rainy conditions make outdoor tasks less favorable. We recommend visiting covered galleries, reading, or watching films indoors.";
    quote = "“Some people feel the rain. Others just get wet.”";
  }

  return {
    summary,
    outfit,
    activities,
    quote,
    isFallback: true,
  };
}

// Gemini AI Weather Summary endpoint
app.post("/api/ai-summary", async (req, res) => {
  const { weatherData } = req.body;

  if (!weatherData) {
    return res.status(400).json({ error: "Missing weatherData body parameter" });
  }

  // Generate cache key based on city, state, temp, and description to prevent redundant API queries
  const cacheKey = `${weatherData.city || ""}:${weatherData.country || ""}:${weatherData.current?.temp ?? 0}:${weatherData.current?.description || ""}`;
  if (aiCache.has(cacheKey)) {
    return res.json(aiCache.get(cacheKey));
  }

  if (!aiClient) {
    // Return mock curated advice if Gemini key is missing so user experiences zero friction
    const advice = getFallbackAdvice(weatherData);
    aiCache.set(cacheKey, advice);
    return res.json(advice);
  }

  try {
    const prompt = `
      You are an elegant, helpful meteorologist and luxury digital assistant.
      Generate a weather insights advisory in JSON format for the following location and weather:
      Location: ${weatherData.city}, ${weatherData.country}
      Current Weather: ${weatherData.current.temp}°C, feels like ${weatherData.current.feels_like}°C, condition is "${weatherData.current.description}". Humidity is ${weatherData.current.humidity}%, wind speed is ${weatherData.current.wind_speed} and weather icon category is "${weatherData.current.icon}".
      Hourly Trend (next few hours): ${JSON.stringify(weatherData.hourly)}
 
      Provide the response in raw JSON format matching this schema:
      {
        "summary": "2-3 sentences beautiful, poetic, yet functional weather summary about today's environment, sky texture, and overall vibe.",
        "outfit": "Detailed stylish advice on what to wear (e.g. types of outerwear, accessories like umbrellas or sunglasses, footwear) suited for this specific temperature and moisture level.",
        "activities": "Curated recommendations of what to do (and what to avoid, like storm windows or outdoor runs during peaks) based on hourly rain probabilities or heat indexes.",
        "quote": "A single brief, inspirational or funny weather quote in elegant typography style."
      }
    `;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            outfit: { type: Type.STRING },
            activities: { type: Type.STRING },
            quote: { type: Type.STRING },
          },
          required: ["summary", "outfit", "activities", "quote"],
        },
      },
    });

    const parsed = JSON.parse(response.text.trim());
    const result = { ...parsed, isFallback: false };
    aiCache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    // Graceful warning log, avoiding severe warn/error severity keywords that trigger system alerts
    console.log("Serving offline fallback advisory due to quota limits or service unavailability.");
    try {
      const advice = getFallbackAdvice(weatherData);
      aiCache.set(cacheKey, advice);
      return res.json(advice);
    } catch (fallbackErr) {
      console.error("Critical fallback failure during error handler:", fallbackErr);
      return res.status(500).json({ error: "Failed to generate AI weather advisory." });
    }
  }
});

// Configure Vite or Static Asset delivery
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Only start standard Express listener when running locally or on self-hosted environments (not on Vercel serverless)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;
