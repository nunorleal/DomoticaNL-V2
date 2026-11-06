import { useEffect, useState, type CSSProperties } from "react";
import { createStorm } from "./storm-core.cjs";
type Bolt={x:number;path:string;branches:string};
export function StormAtmosphere({animate,intensity}:{animate:boolean;intensity:number}){
 const [bolt,setBolt]=useState<Bolt|null>(null);
 useEffect(()=>{
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const storm=createStorm({emit:setBolt,intensity});
  const sync=()=>{if(animate&&!document.hidden&&!reduced.matches)storm.start();else storm.stop()};
  sync();document.addEventListener("visibilitychange",sync);reduced.addEventListener("change",sync);
  return ()=>{document.removeEventListener("visibilitychange",sync);reduced.removeEventListener("change",sync);storm.stop()};
 },[animate,intensity]);
 return <div className="storm-atmosphere" aria-hidden="true">
  <div className="storm-cloud-drift"/>
  <div className="storm-wind">{Array.from({length:9},(_,i)=><i key={i} style={{top:`${18+i*8}%`,"--gust-delay":`${-i*1.9}s`,"--gust-duration":`${6+i%3*1.7}s`} as CSSProperties}/>)}</div>
  {bolt&&<div className="storm-strike" key={bolt.path} style={{"--bolt-x":`${bolt.x/10}%`} as CSSProperties}>
   <div className="storm-cloud-flash"/>
   <svg className="storm-bolt" viewBox="0 0 1000 620" preserveAspectRatio="none"><path className="storm-bolt-halo" d={bolt.path}/><path className="storm-bolt-main" d={bolt.path}/><path className="storm-bolt-branches" d={bolt.branches}/></svg>
  </div>}
 </div>;
}
