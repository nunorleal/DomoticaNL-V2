import { bridge } from "./bridge";
import { initialCity, type City, type Scene, type Snapshot } from "./weather";
export type Settings = {
  city: City;
  seconds: boolean;
  clock12: boolean;
  focusSeconds: number;
  animations: boolean;
  dynamic: boolean;
  night: "auto" | "on" | "off";
  nightPalette: "color" | "red";
  nightUntilBlindOpen: boolean;
  redSchedule: "night" | "custom";
  redStart: string;
  redEnd: string;
  start: string;
  end: string;
  dim: number;
  effects: number;
  cold: number;
  temp: "C" | "F";
  wind: "kmh" | "ms" | "mph";
  demo: "auto" | Scene;
};
export const defaults: Settings = {
  city: initialCity,
  seconds: false,
  clock12: false,
  focusSeconds: 30,
  animations: true,
  dynamic: true,
  night: "auto",
  nightPalette: "color",
  nightUntilBlindOpen: false,
  redSchedule: "night",
  redStart: "23:00",
  redEnd: "07:00",
  start: "23:00",
  end: "07:00",
  dim: 55,
  effects: 50,
  cold: 10,
  temp: "C",
  wind: "kmh",
  demo: "auto",
};
export function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export function save(key: string, value: unknown) {
  try {
    const stored = key === "casa-nl-meteo-v1" ? Object.fromEntries(Object.entries(value as object).filter(([k]) => k !== "city" && k !== "lampReady")) : value;
    if (key === "casa-nl-meteo-v1") bridge?.preferences(stored);
    localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    /* Private mode or full storage: keep this session functional. */
  }
}
export function loadSettings(): Settings {
  let s: Partial<Settings> = {};
  try { s = bridge?.preferences(read("casa-nl-meteo-v1") || {}) || {}; } catch {}
  return {
    ...defaults,
    ...s,
    city: bridge?.city() || initialCity,
    demo: "auto",
  };
}
export const cacheKey = (city: City) =>
  `wc-weather-${city.latitude}-${city.longitude}`;
export function cached(city: City) {
  const s = read<Snapshot>(cacheKey(city));
  return s?.data?.current &&
    s.data.daily?.time?.length &&
    s.data.hourly?.time?.length
    ? s
    : null;
}
