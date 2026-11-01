import { useEffect, useRef } from "react";
import { bedsideMode } from "../meteo-core.js";
import { bridge } from "./bridge";
import { read, save, type Settings } from "./storage";
const key = "casa-nl-meteo-bedside-v1";
export function useBedsideMode(prefs: Settings, baseNight: boolean, baseRed: boolean, timezone: string) {
  const stored = useRef<any>(undefined);
  if (stored.current === undefined) stored.current = read(key) || null;
  const signature = JSON.stringify([prefs.nightUntilBlindOpen, prefs.night, prefs.nightPalette, prefs.redSchedule, prefs.start, prefs.end, prefs.redStart, prefs.redEnd, timezone]);
  const candidate = stored.current?.signature === signature ? stored.current.mode : null;
  const valid = candidate && ["baseNight", "baseRed", "holdNight", "holdRed"].every(k => typeof candidate[k] === "boolean");
  const blind = bridge?.bedroomBlind?.() || {configured:false, ready:false, open:false, position:null};
  const mode = bedsideMode(valid ? candidate : null, {enabled:prefs.nightUntilBlindOpen, night:baseNight, red:baseRed, blindOpen:blind.open === true});
  const serialized = JSON.stringify({signature, mode});
  useEffect(() => {
    stored.current = {signature, mode};
    save(key, stored.current);
  }, [serialized]);
  return {...mode, blind};
}
