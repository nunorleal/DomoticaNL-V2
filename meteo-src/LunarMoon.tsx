import { lunarState, lunarPath } from "./lunar.cjs";
export function lunarDescription(time: number) {
 const m = lunarState(time);
 return `${m.name} · ${Math.round(m.fraction * 100)}% iluminada (cálculo aproximado)`;
}
export function LunarMoon({ id, time, latitude }: { id: string; time: number; latitude: number }) {
 const m = lunarState(time);
 return <g className="lunar-moon" transform={latitude < 0 ? "rotate(180 37 30)" : undefined}>
   <defs>
     <linearGradient id={id + "moonlight"} x1="0" y1="0" x2=".8" y2="1">
       <stop stopColor="#ffffff" />
       <stop offset=".6" stopColor="#e7edff" />
       <stop offset="1" stopColor="#b5d3ed" />
     </linearGradient>
   </defs>
   <circle cx="37" cy="30" r="21" fill="#bed2ee" opacity=".07" />
   <path className="lunar-illumination" d={lunarPath(m.fraction, m.waxing)} fill={`url(#${id}moonlight)`} />
 </g>;
}
