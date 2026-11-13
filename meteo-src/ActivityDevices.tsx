import { CloudDownload, History, MonitorSmartphone, Timer } from "lucide-react";
import { ActivityIcon } from "./ActivityIcon";

export type ActivityRow={id:string;name:string;kind:"timer"|"manual"|"machine"|"charging"|"tv"|"device";remaining?:number;elapsed?:number;estimated?:boolean;paused?:boolean;stale?:boolean;source?:"emitter"|"local";powerWatts?:number|null};

function elapsed(seconds=0) {
  const minutes=Math.floor(seconds/60);
  return minutes>=60
    ? `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,"0")}m`
    : `${minutes} min`;
}

function remaining(seconds=0) {
  const hours=Math.floor(seconds/3600);
  const minutes=String(Math.floor(seconds%3600/60)).padStart(2,"0");
  const rest=String(seconds%60).padStart(2,"0");
  return hours ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
}

type OpenActivity = (id:string) => void;

function ActivityCard({row,onOpen}:{row:ActivityRow;onOpen?:OpenActivity}) {
  const countdown=row.kind==="timer";
  let value=`há ${elapsed(row.elapsed)}`;
  if(countdown) value=`${row.estimated?"≈ ":""}${remaining(row.remaining)}`;
  else if(row.kind==="manual"||["boiler","hob","oven"].includes(row.id)) value=`há ${remaining(row.elapsed)}`;
  else if(row.kind==="charging"&&row.powerWatts!=null) {
    const power=(row.powerWatts/1000).toLocaleString("pt-PT",{maximumFractionDigits:2});
    value=`${power} kW · ${value}`;
  }

  const SourceIcon=row.source==="emitter"?CloudDownload:row.source==="local"?MonitorSmartphone:null;
  const source=row.source==="emitter"?"Dados do emissor":row.source==="local"?"Leitura local":"";
  const state=row.stale?"Última leitura":row.paused?"Em pausa":"";
  const description=countdown ? `${row.estimated?"Tempo restante previsto":"Tempo restante"}: ${value}` : value;
  const title=[row.name,description,source,state].filter(Boolean).join(" · ");

  const Card=onOpen ? "button" : "div";
  return <Card className="glass meteo-activity-device" data-kind={row.kind}
    type={onOpen ? "button" : undefined} role={onOpen ? undefined : "group"}
    title={title} aria-label={onOpen ? `Abrir controlos de ${title}` : title}
    onClick={onOpen ? () => onOpen(row.id) : undefined}>
    <ActivityIcon id={row.id}/>
    <span className="meteo-activity-name">
      <span className="meteo-activity-label">{row.name}</span>
      {SourceIcon&&<SourceIcon className="meteo-activity-source" data-source={row.source} aria-hidden="true"/>}
      {row.stale ? <History className="meteo-activity-state" aria-hidden="true"/> : row.paused && (
        <svg className="meteo-activity-state" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 5v14M18 5v14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      )}
    </span>
    <span className="meteo-activity-time">{countdown&&<Timer aria-hidden="true"/>}{value}</span>
  </Card>;
}

export function ActivityDevices({rows,onOpen}:{rows:ActivityRow[];onOpen?:OpenActivity}) {
  if(!rows.length)return null;
  return <section className="meteo-activity" aria-label="Dispositivos em atividade">
    {Array.from({length:Math.ceil(rows.length/2)},(_,index)=>
      <div className="meteo-activity-row" key={index}>
        {rows.slice(index*2,index*2+2).map(row=><ActivityCard row={row} key={row.id} onOpen={onOpen}/>)}
      </div>
    )}
  </section>;
}
