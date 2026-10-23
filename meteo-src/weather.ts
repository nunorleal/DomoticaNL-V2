import { fetchJson } from "./network";
export type Scene =
  "sunny" | "cold" | "night" | "rain" | "storm" | "fog" | "sunset";
export const scenes: Record<Scene, string> = {
  sunny: "Sol",
  cold: "Frio",
  night: "Noite",
  rain: "Chuva",
  storm: "Trovoada",
  fog: "Nevoeiro",
  sunset: "Pôr do sol",
};
export type City = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  timezone?: string;
};
export const initialCity: City = {
  name: "Figueira da Foz",
  latitude: 40.1508,
  longitude: -8.8618,
  country: "Portugal",
  timezone: "Europe/Lisbon",
};
export type Weather = {
  timezone: string;
  current: {
    time: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    pressure_msl: number;
  };
  hourly: {
    time: number[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    is_day: number[];
  };
  daily: {
    time: number[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: number[];
    sunset: number[];
  };
};
export type Snapshot = { data: Weather; fetchedAt: number; city: City };
export function description(code: number) {
  if (code === 0) return "Céu limpo";
  if (code === 1) return "Pouco nublado";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Céu nublado";
  if ([45, 48].includes(code)) return "Nevoeiro";
  if (code >= 95) return "Trovoada";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neve";
  if (code >= 51 && code <= 57) return "Chuvisco";
  if (code >= 61) return "Chuva";
  return "Condições variáveis";
}
export function selectScene(w: Weather, now: number, cold: number): Scene {
  const c = w.current,
    day = w.daily.time.findIndex(
      (t) => localDate(t * 1000, w.timezone) === localDate(now, w.timezone),
    ),
    i = day < 0 ? 0 : day;
  if (c.weather_code >= 95) return "storm";
  if ([45, 48].includes(c.weather_code)) return "fog";
  if (
    (c.weather_code >= 51 && c.weather_code <= 67) ||
    [80, 81, 82].includes(c.weather_code) ||
    c.precipitation > 0
  )
    return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(c.weather_code)) return "cold";
  const sun = w.daily.sunset[i] * 1000,
    rise = w.daily.sunrise[i] * 1000;
  if (Math.abs(now - sun) < 35 * 60000) return "sunset";
  if (now < rise || now > sun) return "night";
  if (c.temperature_2m <= cold) return "cold";
  return "sunny";
}
export function localDate(t: number, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(t);
}
export function isNightSchedule(minutes: number, start: string, end: string) {
  const a = start.split(":").map(Number),
    b = end.split(":").map(Number),
    s = a[0] * 60 + a[1],
    e = b[0] * 60 + b[1];
  return s === e
    ? true
    : s < e
      ? minutes >= s && minutes < e
      : minutes >= s || minutes < e;
}
export async function getWeather(
  city: City,
  signal: AbortSignal,
): Promise<Snapshot> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "8",
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
  });
  const data = await fetchJson(
    "https://api.open-meteo.com/v1/forecast?" + params,
    signal,
  );
  if (
    !data.current ||
    !data.daily?.time?.length ||
    !data.hourly?.time?.length ||
    !data.timezone
  )
    throw new Error("Resposta meteorológica inválida");
  return { data, fetchedAt: Date.now(), city };
}
export function windDirection(d: number) {
  return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(d / 45) % 8];
}
