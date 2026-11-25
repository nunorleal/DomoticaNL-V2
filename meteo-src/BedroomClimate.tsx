import { House, Thermometer, Droplets, Bluetooth, ChartNoAxesCombined } from "lucide-react";
import { bridge } from "./bridge";
export function BedroomClimate({unit}:{unit:"C"|"F";now:number}) {
 const reading=bridge?.bedroomClimate?.();
 if(!reading?.configured)return null;
 const number=(n:number|null)=>n===null?"—":n.toLocaleString("pt-PT",{maximumFractionDigits:1});
 const temperature=reading.temperature===null?null:unit==="F"?reading.temperature*9/5+32:reading.temperature;
 const quality=reading.status==="pending"?"Por consultar":reading.status==="unavailable"?"Leitura indisponível":reading.status==="last"?"Última leitura":reading.status==="partial"?"Leitura parcial":"";
 const connection=reading.offline?"Sensor offline":reading.error?"Consulta indisponível":"";
 return <section className="glass bedroom-climate" onClick={()=>bridge?.openIndoorSensor?.()} aria-label={`Ambiente interior · ${reading.name || "Divisão"}`} data-quality={reading.status}>
  <div className="bedroom-climate-heading"><House aria-hidden="true"/><div><strong>{reading.name || "Divisão"}</strong><span> · Ambiente interior</span></div><Bluetooth className="bedroom-climate-source" aria-label="Sensor Bluetooth · leituras pela Shelly Cloud"/>{bridge?.openSensorHistory&&<button type="button" className="climate-history-button" onClick={event=>{event.stopPropagation();bridge.openSensorHistory()}} aria-label="Histórico de temperatura e humidade"><ChartNoAxesCombined aria-hidden="true"/><span>Histórico</span></button>}</div>
  <button type="button" className="bedroom-climate-values climate-device-button" aria-label={`Abrir sensor de ${reading.name || "Divisão"}`}><div className="bedroom-climate-value"><Thermometer aria-hidden="true"/><div><strong>{number(temperature)}{temperature!==null?` °${unit}`:""}</strong><span>Temperatura</span></div></div><div className="bedroom-climate-value"><Droplets aria-hidden="true"/><div><strong>{number(reading.humidity)}{reading.humidity!==null?" %":""}</strong><span>Humidade</span></div></div></button>
  {(quality||connection)&&<p className="bedroom-climate-updated">{[quality,connection].filter(Boolean).join(" · ")}</p>}
 </section>;
}
