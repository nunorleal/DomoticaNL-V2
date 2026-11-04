import { useEffect, useRef, useState } from "react";
import { bedsideMode } from "../meteo-core.js";
import { bridge } from "./bridge";
import { read, save, type Settings } from "./storage";
const key = "casa-nl-meteo-bedside-v1";
export function useBedsideMode(prefs: Settings, baseNight: boolean, baseRed: boolean, timezone: string, daylight: {now:number;sunrise:number;sunset:number}) {
  const [morningRequest,setMorningRequest]=useState(0);
  const processedMorning=useRef(0);
  const stored = useRef<any>(undefined);
  if (stored.current === undefined) stored.current = read(key) || null;
  const signature = JSON.stringify([prefs.nightUntilBlindOpen, prefs.night, prefs.nightPalette, prefs.redSchedule, prefs.start, prefs.end, prefs.redStart, prefs.redEnd, timezone]);
  const candidate = stored.current?.signature === signature ? stored.current.mode : null;
  const valid = candidate && ["baseNight", "baseRed", "holdNight", "holdRed"].every(k => typeof candidate[k] === "boolean");
  const blind = bridge?.bedroomBlind?.() || {configured:false, ready:false, open:false, position:null};
  const mode = bedsideMode(valid ? candidate : null, {enabled:prefs.nightUntilBlindOpen, night:baseNight, red:baseRed, blindOpen:blind.open === true, ...daylight, morningRequested:morningRequest!==processedMorning.current});
  const serialized = JSON.stringify({signature, mode});
  useEffect(() => {
    stored.current = {signature, mode};
    processedMorning.current=morningRequest;
    save(key, stored.current);
  }, [serialized]);
  return {...mode, blind, requestMorning:()=>setMorningRequest(v=>v+1)};
}
