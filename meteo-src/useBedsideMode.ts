import { useEffect, useRef, useState } from "react";
import { bedsideMode, nextBedsidePalette } from "../meteo-core.js";
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
  const [manual,setManual]=useState<any>(()=>stored.current?.manual||null);
  const fresh=manual&&["day","color","red"].includes(manual.palette)&&manual.signature===signature&&manual.baseNight===baseNight&&manual.baseRed===baseRed&&Number.isFinite(manual.at)&&daylight.now>=manual.at&&daylight.now-manual.at<86400000;
  const released=fresh&&manual.palette!=="day"&&manual.blindClosed&&blind.ready&&blind.open===true;
  const activeManual=fresh&&!released?manual:null;
  useEffect(()=>{
    if(manual&&!activeManual)setManual(null);
    else if(activeManual&&!activeManual.blindClosed&&blind.ready&&Number.isFinite(blind.position)&&blind.position<100)setManual({...activeManual,blindClosed:true});
  },[manual,!!activeManual,blind.ready,blind.open,blind.position]);
  const mode = bedsideMode(valid ? candidate : null, {enabled:prefs.nightUntilBlindOpen, night:baseNight, red:baseRed, blindOpen:blind.open === true, blindPosition:blind.ready ? blind.position : null, ...daylight, morningRequested:morningRequest!==processedMorning.current});
  const serialized = JSON.stringify({signature, mode, manual:activeManual});
  useEffect(() => {
    stored.current = {signature, mode, manual:activeManual};
    processedMorning.current=morningRequest;
    save(key, stored.current);
  }, [serialized]);
  const visible=activeManual?{night:activeManual.palette!=="day",red:activeManual.palette==="red"}:mode;
  const cycleMode=()=>setManual({palette:nextBedsidePalette(visible),signature,baseNight,baseRed,at:daylight.now,blindClosed:blind.ready&&Number.isFinite(blind.position)&&blind.position<100});
  return {...mode,...visible, blind, cycleMode, requestMorning:()=>setMorningRequest(v=>v+1)};
}
