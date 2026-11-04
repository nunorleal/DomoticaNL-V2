import { House, Thermometer, Droplets, Bluetooth } from "lucide-react";
import { bridge } from "./bridge";
export function BedroomClimate({unit}:{unit:"C"|"F";now:number}) {
 const reading=bridge?.bedroomClimate?.();
 if(!reading?.configured)return null;
 const number=(n:number|null)=>n===null?"—":n.toLocaleString("pt-PT",{maximumFractionDigits:1});
 const temperature=reading.temperature===null?null:unit==="F"?reading.temperature*9/5+32:reading.temperature;
 const quality=reading.status==="pending"?"Por consultar":reading.status==="unavailable"?"Leitura indisponível":reading.status==="last"?"Última leitura":reading.status==="partial"?"Leitura parcial":"";
 const connection=reading.offline?"Sensor offline":reading.error?"Consulta indisponível":"";
 return <section className="glass bedroom-climate" aria-label={`Ambiente interior · ${reading.name || "Divisão"}`} data-quality={reading.status}>
  <div className="bedroom-climate-heading"><House aria-hidden="true"/><div><strong>{reading.name || "Divisão"}</strong><span> · Ambiente interior</span></div><Bluetooth className="bedroom-climate-source" aria-label="Sensor Bluetooth · leituras pela Shelly Cloud"/></div>
  <div className="bedroom-climate-values"><div className="bedroom-climate-value"><Thermometer aria-hidden="true"/><div><strong>{number(temperature)}{temperature!==null?` °${unit}`:""}</strong><span>Temperatura</span></div></div><div className="bedroom-climate-value"><Droplets aria-hidden="true"/><div><strong>{number(reading.humidity)}{reading.humidity!==null?" %":""}</strong><span>Humidade</span></div></div></div>
  {(quality||connection)&&<p className="bedroom-climate-updated">{[quality,connection].filter(Boolean).join(" · ")}</p>}
 </section>;
}
