import { useEffect, useState } from "react";
import { bridge } from "./bridge";
const unavailable = {configured:false,state:null,busy:false,error:"Abra a MeteoNL através da Casa NL."};
export function useShellyLamp() {
 const [lamp,setLamp] = useState(() => bridge?.lamp() ?? unavailable);
 useEffect(() => {
  const refresh = () => setLamp(bridge?.lamp() ?? unavailable);
  const timer = window.setInterval(refresh, 500);
  return () => clearInterval(timer);
 },[]);
 return {...lamp, toggle: async () => { await bridge?.toggleLamp(); setLamp(bridge?.lamp() ?? unavailable); }};
}
export type ShellyLamp = ReturnType<typeof useShellyLamp>;
