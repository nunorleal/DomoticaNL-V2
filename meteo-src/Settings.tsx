import { ActivityIcon } from "./ActivityIcon";
import { install as installDismiss } from "../dialog-dismiss.js";
import { bridge, openCasaSettings } from "./bridge";
import { fetchJson } from "./network";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, ChevronRight, Clock, Info, MapPin, Moon, Mountain, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Settings as Prefs } from "./storage";
import { scenes, type City } from "./weather";
function SettingsGroup({ icon, title, summary, children }: {
  icon: ReactNode;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <details name="meteo-preference-groups" className="meteo-preference-group"
      onToggle={(event) => {
        if (!event.currentTarget.open) return;
        const group = event.currentTarget;
        group.parentElement?.querySelectorAll<HTMLDetailsElement>(".meteo-preference-group[open]").forEach(other => {
          if (other !== group) other.open = false;
        });
      }}>
      <summary>
        {icon}
        <span><strong>{title}</strong><small>{summary}</small></span>
        <ChevronRight className="meteo-group-chevron" aria-hidden="true" />
      </summary>
      <div className="meteo-group-content">{children}</div>
    </details>
  );
}
export function Settings({
  value,
  onChange,
  onClose,
  target,
}: {
  value: Prefs;
  onChange: (s: Prefs) => void;
  onClose: () => void;
  target?: HTMLElement;
}) {
  const blind = bridge?.bedroomBlind?.();
  const sensors: {id:string;name:string;configured:boolean}[] = bridge?.indoorSensors?.() || [];
  const activityDevices: {id: string; name: string; configured: boolean}[] = bridge?.activityDevices?.() || [];
  const sensorName = sensors.find(sensor => sensor.id === value.indoorSensor)?.name || "Sensor não associado";
  const windUnit = { kmh: "km/h", ms: "m/s", mph: "mph" }[value.wind];
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<City[]>([]),
    [searchState, setSearchState] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    searchId = useRef(0);
  const set = <K extends keyof Prefs>(key: K, v: Prefs[K]) =>
    onChange({ ...value, [key]: v });
  useEffect(() => {
    if (target) return;
    const el = dialog.current;
    el?.showModal();
    const cleanup = el ? installDismiss(el, onClose) : () => {};
    return () => { cleanup(); el?.close(); };
  }, [target]);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    const id = ++searchId.current;
    if (query.trim().length < 2) {
      setSearchState("Escreva pelo menos duas letras.");
      return;
    }
    setSearchState("A procurar…");
    setResults([]);
    try {
      const d = await fetchJson(
        "https://geocoding-api.open-meteo.com/v1/search?" +
          new URLSearchParams({
            name: query.trim(),
            count: "8",
            language: "pt",
            format: "json",
          }),
      );
      if (id !== searchId.current) return;
      setResults(d.results || []);
      setSearchState(d.results?.length ? "" : "Não foram encontradas cidades.");
    } catch {
      if (id === searchId.current)
        setSearchState("Não foi possível pesquisar. Verifique a ligação.");
    }
  }
  const timer = (
    <label className="meteo-timer-field">
      <span>Ampliar relógio após inatividade<small>Quando estás na MeteoNL</small></span>
      <select value={value.focusSeconds} onChange={e => set("focusSeconds", Number(e.target.value))}>
        <option value={0}>Desativado</option>
        <option value={15}>15 segundos</option>
        <option value={30}>30 segundos</option>
        <option value={60}>1 minuto</option>
        <option value={120}>2 minutos</option>
        <option value={300}>5 minutos</option>
      </select>
    </label>
  );
  const content = (
    <div className="settings-body meteo-preferences">
      {!target && timer}
      <SettingsGroup icon={<MapPin aria-hidden="true" />} title="Localização e sensor interior" summary={value.city.name + " · " + sensorName}>
          <div className="meteo-city"><span>Cidade</span><strong>{value.city.name}</strong></div>
          <form onSubmit={search} className="search">
            <input
              aria-label="Pesquisar cidade"
              placeholder="Procurar outra cidade"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button aria-label="Pesquisar">
              <Search size={19} />
            </button>
          </form>
          <p role="status">{searchState}</p>
          {results.map((c, i) => (
            <button
              key={i}
              className="city-result"
              onClick={() => {
                set("city", c);
                setResults([]);
                setQuery("");
                setSearchState("");
              }}
            >
              {c.name}
              <small>
                {c.country} · {c.timezone}
              </small>
            </button>
          ))}
          <label>Sensor da divisão
            <select value={value.indoorSensor} onChange={(e) => { set("indoorSensor", e.target.value); bridge?.selectIndoorSensor?.(e.target.value); }}>
              {!sensors.some(s => s.id === value.indoorSensor) && <option value={value.indoorSensor}>Sensor não associado</option>}
              {sensors.filter(s => s.configured || s.id === value.indoorSensor).map(s => <option key={s.id} value={s.id}>{s.name}{s.configured ? "" : " · sem sensor associado"}</option>)}
            </select>
          </label>
      </SettingsGroup>
      <SettingsGroup icon={<Clock aria-hidden="true" />} title="Relógio e unidades" summary={`${value.clock12 ? 12 : 24} horas · °${value.temp} · ${windUnit}`}>
          <label>
            Formato
            <select
              value={value.clock12 ? "12" : "24"}
              onChange={(e) => set("clock12", e.target.value === "12")}
            >
              <option value="24">24 horas</option>
              <option value="12">12 horas</option>
            </select>
          </label>
          <label>
            Mostrar segundos
            <input
              type="checkbox"
              checked={value.seconds}
              onChange={(e) => set("seconds", e.target.checked)}
            />
          </label>
          <label>
            Temperatura
            <select
              value={value.temp}
              onChange={(e) => set("temp", e.target.value as Prefs["temp"])}
            >
              <option value="C">Celsius · °C</option>
              <option value="F">Fahrenheit · °F</option>
            </select>
          </label>
          <label>
            Vento
            <select
              value={value.wind}
              onChange={(e) => set("wind", e.target.value as Prefs["wind"])}
            >
              <option value="kmh">km/h</option>
              <option value="ms">m/s</option>
              <option value="mph">mph</option>
            </select>
          </label>
      </SettingsGroup>
      <SettingsGroup icon={<Moon aria-hidden="true" />} title="Modo de cabeceira" summary="Horários, modo vermelho e escurecimento">
          <label>
            Ativação
            <select
              value={value.night}
              onChange={(e) => set("night", e.target.value as Prefs["night"])}
            >
              <option value="auto">Horário automático</option>
              <option value="on">Sempre ativo</option>
              <option value="off">Desativado</option>
            </select>
          </label>
          <div className="schedule">
            <label>
              Das
              <input
                aria-label="Início do modo noturno"
                type="time"
                value={value.start}
                onChange={(e) => set("start", e.target.value || "23:00")}
              />
            </label>
            <label>
              Às
              <input
                aria-label="Fim do modo noturno"
                type="time"
                value={value.end}
                onChange={(e) => set("end", e.target.value || "07:00")}
              />
            </label>
          </div>
          <label>
            Cores do modo noturno
            <select value={value.nightPalette} onChange={(e) => set("nightPalette", e.target.value as Prefs["nightPalette"])}>
              <option value="color">Colorido esbatido</option>
              <option value="red">Vermelho</option>
            </select>
          </label>
          {value.nightPalette === "red" && <>
            <label>Horário do vermelho
              <select value={value.redSchedule} onChange={(e) => set("redSchedule", e.target.value as Prefs["redSchedule"])}>
                <option value="night">Seguir modo de cabeceira</option>
                <option value="custom">Escolher horas</option>
              </select>
            </label>
            {value.redSchedule === "custom" && <div className="schedule">
              <label>Vermelho das<input aria-label="Início do vermelho" type="time" value={value.redStart} onInput={(e) => set("redStart", e.currentTarget.value || "23:00")} /></label>
              <label>Até às<input aria-label="Fim do vermelho" type="time" value={value.redEnd} onInput={(e) => set("redEnd", e.currentTarget.value || "07:00")} /></label>
            </div>}
          </>}
          <label>
            Manter modo noturno até o estore do quarto abrir a 100%
            <input type="checkbox" checked={value.nightUntilBlindOpen} onChange={e => set("nightUntilBlindOpen", e.target.checked)} />
          </label>
          {value.nightUntilBlindOpen && <p role="status">{!blind?.configured ? "Associe o estore do quarto principal nas definições da Casa NL para permitir a saída automática." : !blind.ready ? "A aguardar uma leitura atual do estore; dados antigos ou indisponíveis não libertam o modo." : `Estore do quarto principal: ${blind.position}%.`}</p>}
          <p>Este check prolonga o modo noturno ou vermelho depois do fim do horário. A abertura confirmada a 100% do estore do quarto principal também desliga o vermelho quando o estore é aberto fora da MeteoNL.</p>
          <label>
            Escurecimento · {value.dim}%
            <input
              aria-label="Escurecimento"
              type="range"
              min="25"
              max="85"
              value={value.dim}
              onChange={(e) => set("dim", +e.target.value)}
            />
          </label>
          <p>
            O escurecimento é apenas visual. O navegador não controla o brilho
            físico do iPad nem garante que o ecrã permaneça ligado.
          </p>
      </SettingsGroup>
      <SettingsGroup icon={<Activity aria-hidden="true" />} title="Dispositivos em atividade" summary={value.activityEnabled ? `Ativo · ${value.activityDevices.length} selecionados` : "Desativado"}>
          <label className="check"><span>Mostrar dispositivos em atividade</span><input type="checkbox" checked={value.activityEnabled} onChange={e=>set("activityEnabled",e.target.checked)}/></label>
          <div className="activity-device-options">{activityDevices.map((device)=><label className="check" key={device.id}><ActivityIcon id={device.id}/><span>{device.name}{!device.configured&&<small> · por associar</small>}</span><input type="checkbox" disabled={!value.activityEnabled} checked={value.activityDevices.includes(device.id)} onChange={e=>set("activityDevices",e.target.checked?[...value.activityDevices,device.id]:value.activityDevices.filter(id=>id!==device.id))}/></label>)}</div>
          <p>O tempo conta desde a deteção da atividade. As máquinas toleram pausas até 5 minutos.</p>
          <button type="button" className="shared-settings-button" onClick={openCasaSettings}>Configurar Shelly Cloud e candeeiro</button>
      </SettingsGroup>
      <SettingsGroup icon={<Mountain aria-hidden="true" />} title="Paisagem e animações" summary="Efeitos, limite de frio e demonstração">
          <label>
            Paisagens dinâmicas
            <input
              type="checkbox"
              checked={value.dynamic}
              onChange={(e) => set("dynamic", e.target.checked)}
            />
          </label>
          <label>
            Animações
            <input
              type="checkbox"
              checked={value.animations}
              onChange={(e) => set("animations", e.target.checked)}
            />
          </label>
          <label>
            Intensidade dos efeitos · {value.effects}%
            <input
              aria-label="Intensidade dos efeitos"
              type="range"
              min="0"
              max="100"
              value={value.effects}
              onChange={(e) => set("effects", +e.target.value)}
            />
          </label>
          <label>
            Considerar frio abaixo de
            <input
              aria-label="Limite de frio em Celsius"
              className="number"
              type="number"
              min="-30"
              max="25"
              value={value.cold}
              onChange={(e) => set("cold", +e.target.value)}
            />
            <span>°C</span>
          </label>
          <label>
            Pré-visualizar paisagem
            <select value={value.demo} onChange={e => set("demo", e.target.value as Prefs["demo"])}>
              <option value="auto">Tempo real</option>
              {Object.entries(scenes).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
            </select>
          </label>
          <p>Na demonstração, a hora e os dados meteorológicos mantêm-se reais.</p>
      </SettingsGroup>
      <SettingsGroup icon={<Info aria-hidden="true" />} title="Instalação e fontes" summary="iPad e dados meteorológicos">
          <p>
            No Safari, toque em Partilhar → Adicionar ao ecrã principal →
            Adicionar. Use um endereço HTTPS. A última previsão é guardada neste dispositivo; os dados novos requerem Internet.
          </p>
          <p>
            Dados:{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            . Paisagens artísticas geradas por IA, inspiradas na costa
            portuguesa.
          </p>
      </SettingsGroup>
    </div>
  );
  if (target) {
    const timerTarget = target.ownerDocument.getElementById("meteo-clock-timer");
    return <>{timerTarget && createPortal(timer, timerTarget)}{createPortal(content, target)}</>;
  }
  return (
    <dialog
      ref={dialog}
      className="settings"
      aria-labelledby="settings-title"
      onCancel={onClose}
    >
      <header>
        <div>
          <span className="eyebrow">AO SEU RITMO</span>
          <h2 id="settings-title">O seu MeteoNL</h2>
        </div>
        <button
          onClick={onClose}
          className="icon-button"
          aria-label="Fechar definições"
        >
          <X />
        </button>
      </header>
      {content}
      <footer>Guardado automaticamente</footer>
    </dialog>
  );
}
