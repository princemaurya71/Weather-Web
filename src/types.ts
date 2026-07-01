export interface WeatherCurrent {
  temp: number;
  feels_like: number;
  description: string;
  humidity: number;
  wind_speed: number;
  pressure: number;
  icon: string;
  uv_index: number;
}

export interface WeatherHourly {
  time: string;
  temp: number;
  description: string;
  pop: number; // probability of precipitation
  icon: string;
}

export interface WeatherDaily {
  day_name: string;
  temp_min: number;
  temp_max: number;
  icon: string;
  description: string;
  humidity: number;
  wind: number;
}

export interface WeatherData {
  provider: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
}

export interface AISummary {
  summary: string;
  outfit: string;
  activities: string;
  quote: string;
  isFallback?: boolean;
}
