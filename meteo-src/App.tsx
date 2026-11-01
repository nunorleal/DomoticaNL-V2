import { bridge, openCasaSettings } from "./bridge";
import { RealTemperature } from "./RealTemperature";
import { useBedsideMode } from "./useBedsideMode";
import { useShellyLamp } from "./useShellyLamp";
import { assetUrl } from "./assets";
import { APP_VERSION } from "./app-info";
import { useEffect, useRef, useState } from "react";
import { redActive } from "../meteo-core.js";
import { useFocusView } from "./useFocusView";
import {
  Settings as Gear,
  Lightbulb,
  House,
  MapPin,
  Sunrise,
  Sunset,
  Wind,
  Droplets,
  Gauge,
  CalendarDays,
  Clock3,
  Moon,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { WeatherIcon } from "./WeatherIcon";
import { Settings } from "./Settings";
import {
  cached,
  cacheKey,
  loadSettings,
  save,
  type Settings as Prefs,
} from "./storage";
import {
  description,
  getWeather,
  isNightSchedule,
  localDate,
  scenes,
  selectScene,
  windDirection,
  type Snapshot,
  type Scene,
} from "./weather";
const fmt = (t: number, tz: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone: tz, ...options }).format(t);
function Landscape({
  scene,
  animate,
  intensity,
}: {
  scene: Scene;
  animate: boolean;
  intensity: number;
}) {
  const [visible, setVisible] = useState(scene);
  useEffect(() => {
    let active = true;
    const im = new Image();
    im.src = assetUrl(`weather-backgrounds/${scene}.webp`);
    im.onload = () => {
      if (active) setVisible(scene);
    };
    return () => {
      active = false;
    };
  }, [scene]);
  return (
    <div
      className={"landscape " + (animate ? "animated " : "") + visible}
      aria-hidden="true"
      style={{ "--effect": intensity / 100 } as React.CSSProperties}
    >
      {Object.keys(scenes).map((s) => (
        <div
          key={s}
          className={"landscape-image " + (visible === s ? "visible" : "")}
          style={{
            backgroundImage: `url("${assetUrl(`weather-backgrounds/${s}.webp`)}")`,
          }}
        />
      ))}
      <div className="atmosphere" />
      <div className="light-glow" />
      {(visible === "rain" || visible === "storm") && (
        <div className="rain-particles">
          {Array.from({ length: 32 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${-i * 0.19}s`,
                animationDuration: `${0.8 + (i % 5) * 0.18}s`,
              }}
            />
          ))}
        </div>
      )}
      {visible === "fog" && <div className="fog-layer" />}
      {visible === "night" && <div className="stars" />}
      {visible === "storm" && <div className="lightning" />}
    </div>
  );
}
export default function App() {
  useEffect(() => { bridge?.ready?.(); }, []);
  const lamp = useShellyLamp();
  const [prefs, setPrefs] = useState(loadSettings),
    [now, setNow] = useState(Date.now()),
    [open, setOpen] = useState(false),
    [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
      cached(prefs.city),
    ),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine),
    [retry, setRetry] = useState(0);
  const focus = useFocusView(prefs.focusSeconds, open);
  const dismissFocus = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (focus.expanded) dismissFocus.current?.focus({ preventScroll: true }); }, [focus.expanded]);
  useEffect(() => {
    save("casa-nl-meteo-v1", prefs);
  }, [prefs]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let alive = true,
      inflight = false,
      lastAttempt = 0;
    const controller = new AbortController();
    const city = prefs.city;
    setSnapshot(cached(city));
    setError(false);
    async function refresh() {
      if (inflight || Date.now() - lastAttempt < 60000) return;
      const stored = cached(city);
      if (stored && Date.now() - stored.fetchedAt < 15 * 60000) {
        setSnapshot(stored);
        return;
      }
      inflight = true;
      lastAttempt = Date.now();
      setLoading(true);
      try {
        const s = await getWeather(city, controller.signal);
        if (alive) {
          save(cacheKey(city), s);
          setSnapshot(s);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      } finally {
        inflight = false;
        if (alive) setLoading(false);
      }
    }
    void refresh();
    const interval = setInterval(refresh, 60000);
    const visibility = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        void refresh();
      }
    };
    const network = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) {
        lastAttempt = 0;
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, [prefs.city.latitude, prefs.city.longitude, retry]);
  const w = snapshot?.data,
    tz = w?.timezone || prefs.city.timezone || "Europe/Lisbon";
  const time = fmt(now, tz, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: prefs.clock12 ? "h12" : "h23",
    }),
    seconds = fmt(now, tz, { second: "2-digit" }).padStart(2, "0");
  const localMinutes =
    +fmt(now, tz, { hour: "2-digit", hourCycle: "h23" }) * 60 +
    +fmt(now, tz, { minute: "2-digit" });
  const scheduledNight =
    prefs.night === "on" ||
    (prefs.night === "auto" &&
      isNightSchedule(localMinutes, prefs.start, prefs.end));
  const scheduledRed = redActive(prefs, localMinutes, scheduledNight);
  const { red, night } = useBedsideMode(prefs, scheduledNight, scheduledRed, tz);
  useEffect(() => {
    document.documentElement.classList.toggle("red-night", red);
    return () => document.documentElement.classList.remove("red-night");
  }, [red]);
  const scene =
    prefs.demo !== "auto"
      ? prefs.demo
      : !prefs.dynamic
        ? "sunny"
        : w
          ? selectScene(w, now, prefs.cold)
          : localMinutes < 420 || localMinutes > 1200
            ? "night"
            : "sunny";
  const motion =
    prefs.animations &&
    !night &&
    prefs.effects > 0 &&
    !(
      (navigator as Navigator & { hardwareConcurrency: number })
        .hardwareConcurrency < 4
    );
  const temp = (n: number) =>
    Math.round(prefs.temp === "F" ? (n * 9) / 5 + 32 : n);
  const tempText = (n: number) => `${temp(n)}°`;
  const speed = (n: number) =>
    Math.round(
      prefs.wind === "ms" ? n / 3.6 : prefs.wind === "mph" ? n / 1.609344 : n,
    );
  const today = w
    ? Math.max(
        0,
        w.daily.time.findIndex(
          (t) => localDate(t * 1000, tz) === localDate(now, tz),
        ),
      )
    : 0;
  const hours = w
    ? w.hourly.time
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t * 1000 >= Math.floor(now / 3600000) * 3600000)
        .slice(0, 12)
    : [];
  const days = w
    ? w.daily.time
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => localDate(t * 1000, tz) >= localDate(now, tz))
        .slice(0, 7)
    : [];
  const stale = !!snapshot && now - snapshot.fetchedAt > 30 * 60000;
  const min = w
      ? Math.min(...days.map(({ i }) => w.daily.temperature_2m_min[i]))
      : 0,
    max = w
      ? Math.max(...days.map(({ i }) => w.daily.temperature_2m_max[i]))
      : 30;
  useEffect(() => {
    const sync = () => { const city = bridge?.city(); if(city) setPrefs(p => ({...p, city})); };
    window.parent.addEventListener("environmentchange", sync);
    sync();
    return () => window.parent.removeEventListener("environmentchange", sync);
  }, []);
  function update(s: Prefs) {
    if (s.city.latitude !== prefs.city.latitude || s.city.longitude !== prefs.city.longitude) bridge?.setCity(s.city);
    setPrefs(s);
  }
  return (
    <>
      <Landscape scene={scene} animate={motion} intensity={prefs.effects} />
      <div
        className={"night-veil " + (night ? "on" : "")}
        style={{ opacity: night ? prefs.dim / 100 : 0 }}
      />
      <main data-weather-motion={prefs.animations && prefs.effects > 0 ? "on" : "off"} data-night-palette={red ? "red" : night ? "color" : "day"} className={[night ? "bedside" : "", focus.expanded ? "focus-view" : ""].filter(Boolean).join(" ")} data-focus-view={focus.expanded ? "expanded" : "normal"}>
        <nav className="topbar">
          <div className="brand">
            <span className="wordmark">
              <span className="brand-dot" />
              MeteoNL
            </span>
            <span className="app-version" aria-label={`Versão ${APP_VERSION}`}>
              {APP_VERSION}
            </span>
          </div>
          <div className="top-actions"><button className="icon-button" aria-label="Voltar à casa" title="Voltar à casa" onClick={() => bridge?.home()}><House size={20}/></button>
            <button
              className={
                "icon-button lamp-button " + (lamp.state?.on ? "selected" : "")
              }
              aria-label={
                !lamp.configured
                  ? "Configurar lâmpada da mesinha"
                  : lamp.busy
                    ? "A comunicar com a lâmpada"
                    : lamp.state
                      ? lamp.state.on
                        ? "Desligar lâmpada da mesinha"
                        : "Ligar lâmpada da mesinha"
                      : "Atualizar estado da lâmpada da mesinha"
              }
              aria-pressed={lamp.state?.on}
              aria-busy={lamp.busy}
              disabled={lamp.busy}
              title={
                lamp.error ||
                (lamp.state
                  ? `Lâmpada ${lamp.state.on ? "ligada" : "desligada"}`
                  : "Lâmpada · Shelly Cloud")
              }
              onClick={() => {
                if (!lamp.configured) {
                  openCasaSettings();
                } else {
                  void lamp.toggle();
                }
              }}
            >
              {lamp.busy ? (
                <RefreshCw size={20} className="lamp-spin" />
              ) : (
                <Lightbulb size={20} />
              )}
            </button>
            <button
              className={"icon-button " + (night ? "selected" : "")}
              title="Modo de cabeceira"
              aria-label="Alternar modo de cabeceira"
              onClick={() => update({ ...prefs, night: night ? "off" : "on" })}
            >
              <Moon size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Abrir definições"
              onClick={() => {
                setOpen(true);
              }}
            >
              <Gear size={20} />
            </button>
          </div>
        </nav>
        {lamp.error && !open && (
          <button
            className="lamp-notice"
            role="status"
            onClick={() => {
              openCasaSettings();
            }}
          >
            Lâmpada: {lamp.error}
          </button>
        )}
        <header className="hero">
          <div className="date">
            <span>{fmt(now, tz, { weekday: "long" })}</span>
            <p>
              {fmt(now, tz, { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="clock" aria-label={"Hora local: " + time}>
            <span>{time.split(" ")[0]}</span>
            {prefs.seconds && <small className="seconds">{seconds}</small>}
            {prefs.clock12 && (
              <small className="period">
                {time.split(" ").slice(1).join(" ")}
              </small>
            )}
          </div>
          <div className="location">
            <MapPin size={18} strokeWidth={1.6} />
            <h1>{prefs.city.name}</h1>
          </div>
          {w && (
            <div className="current-summary">
              <WeatherIcon
                code={w.current.weather_code}
                night={!w.current.is_day}
                time={now}
                latitude={prefs.city.latitude}
              />
              <div className="weather-reading">
                <div className="temperature">
                  {tempText(w.current.temperature_2m)}
                </div>
                <RealTemperature unit={prefs.temp} />
                <div className="condition">
                  <h2>{description(w.current.weather_code)}</h2>
                  <p>Sensação de {tempText(w.current.apparent_temperature)}</p>
                  <p className="high-low">
                    Máx. {tempText(w.daily.temperature_2m_max[today])}
                    <span>·</span>Mín.{" "}
                    {tempText(w.daily.temperature_2m_min[today])}
                  </p>
                </div>
              </div>
            </div>
          )}
          {!w && <RealTemperature unit={prefs.temp} />}
          <div className="sun-times">
            <span>
              <Sunrise size={17} />
              {w
                ? fmt(w.daily.sunrise[today] * 1000, tz, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  })
                : "—"}
            </span>
            <i />
            <span>
              <Sunset size={17} />
              {w
                ? fmt(w.daily.sunset[today] * 1000, tz, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  })
                : "—"}
            </span>
          </div>
          {prefs.demo !== "auto" && (
            <button
              className="demo-badge"
              onClick={() => update({ ...prefs, demo: "auto" })}
            >
              Paisagem de demonstração · {scenes[prefs.demo]} · Sair
            </button>
          )}
        </header>
        <div className="panels">
          <section
            className="glass current-panel"
            aria-label="Meteorologia atual"
          >
            {w ? (
              <>
                <div className="weather-details">
                  <div>
                    <Droplets />
                    <span>Humidade</span>
                    <strong>
                      {w.current.relative_humidity_2m}
                      <small>%</small>
                    </strong>
                  </div>
                  <div>
                    <Wind />
                    <span>
                      Vento · {windDirection(w.current.wind_direction_10m)}
                    </span>
                    <strong>
                      {speed(w.current.wind_speed_10m)}
                      <small>
                        {prefs.wind === "kmh"
                          ? "km/h"
                          : prefs.wind === "ms"
                            ? "m/s"
                            : "mph"}
                      </small>
                    </strong>
                  </div>
                  <div>
                    <Gauge />
                    <span>Pressão</span>
                    <strong>
                      {Math.round(w.current.pressure_msl)}
                      <small>hPa</small>
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty">
                <WeatherIcon code={2} />
                <h2>
                  {loading
                    ? "A olhar para o céu…"
                    : "O relógio continua. O tempo já volta."}
                </h2>
                <p>
                  {loading
                    ? "A obter a previsão para " + prefs.city.name
                    : offline
                      ? "Sem Internet. A previsão será obtida quando a ligação regressar."
                      : "Não foi possível obter a meteorologia."}
                </p>
                {!loading && (
                  <button className="icon-button meteo-refresh-button" aria-label="Atualizar meteorologia" title="Atualizar meteorologia" onClick={() => setRetry((r) => r + 1)}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.36 6.36L3 16M8 16H3v5" /></svg>
                  </button>
                )}
              </div>
            )}
          </section>
          <section className="glass hourly-panel">
            <h2 className="panel-title">
              <Clock3 />
              PRÓXIMAS HORAS{" "}
              <span>
                {w
                  ? "Hora local · " + tz.replaceAll("_", " ")
                  : "A aguardar previsão"}
              </span>
            </h2>
            <div
              className="hourly-scroll"
              tabIndex={0}
              aria-label="Previsão das próximas 12 horas, deslize para ver mais"
            >
              {hours.map(({ t, i }, j) => (
                <div className={"hour " + (j === 0 ? "now" : "")} key={t}>
                  <span>
                    {j === 0
                      ? "Agora"
                      : fmt(t * 1000, tz, {
                          hour: "2-digit",
                          minute: "2-digit",
                          hourCycle: "h23",
                        })}
                  </span>
                  <WeatherIcon
                    code={w!.hourly.weather_code[i]}
                    night={!w!.hourly.is_day[i]}
                    time={t * 1000}
                    latitude={prefs.city.latitude}
                  />
                  <strong>{tempText(w!.hourly.temperature_2m[i])}</strong>
                  <small
                    className={
                      w!.hourly.precipitation_probability[i] > 0 ? "" : "dry"
                    }
                  >
                    {w!.hourly.precipitation_probability[i] != null
                      ? w!.hourly.precipitation_probability[i] + "%"
                      : "—"}
                  </small>
                </div>
              ))}
              {!w && (
                <p className="placeholder">
                  A previsão horária aparecerá aqui.
                </p>
              )}
            </div>
          </section>
          <section className="glass weekly-panel">
            <h2 className="panel-title">
              <CalendarDays />
              OS PRÓXIMOS 7 DIAS <span>Uma semana à sua frente</span>
            </h2>
            <div className="week">
              {days.map(({ t, i }, j) => (
                <div className="day" key={t}>
                  <span className="day-name">
                    {j === 0 && localDate(t * 1000, tz) === localDate(now, tz)
                      ? "Hoje"
                      : fmt(t * 1000, tz, { weekday: "short" }).replace(
                          ".",
                          "",
                        )}
                  </span>
                  <WeatherIcon code={w!.daily.weather_code[i]} />
                  <span className="day-desc">
                    {description(w!.daily.weather_code[i])}
                  </span>
                  <span className="low">
                    {tempText(w!.daily.temperature_2m_min[i])}
                  </span>
                  <div className="range">
                    <i
                      style={{
                        left: `${((w!.daily.temperature_2m_min[i] - min) / (max - min || 1)) * 100}%`,
                        width: `${Math.max(4, ((w!.daily.temperature_2m_max[i] - w!.daily.temperature_2m_min[i]) / (max - min || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="high">
                    {tempText(w!.daily.temperature_2m_max[i])}
                  </span>
                </div>
              ))}
              {!w && (
                <p className="placeholder">
                  A sua semana, assim que houver ligação.
                </p>
              )}
            </div>
          </section>
        </div>
        <footer className="app-footer">
          <span className="update">
            <i className={error || offline || stale ? "warning" : ""} />
            {snapshot
              ? `${offline ? "Sem Internet · " : error ? "Falha de atualização · " : ""}${stale ? "Dados desatualizados · " : ""}Atualizado às ${fmt(snapshot.fetchedAt, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`
              : loading
                ? "A ligar à Open-Meteo…"
                : "Sem dados meteorológicos"}
            {loading && snapshot && <RefreshCw size={11} />}
          </span>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo <ArrowUpRight size={11} />
          </a>
        </footer>
      </main>
      {focus.expanded && <button ref={dismissFocus} className="focus-dismiss" aria-label="Voltar à vista normal" onClick={(event) => { event.preventDefault(); event.stopPropagation(); focus.wake(); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); focus.wake(); } }}><span>Toque para voltar</span></button>}
      {open && (
        <Settings
          value={prefs}
          onChange={update}
          onClose={() => setOpen(false)}
        />
      )}
      {red && <div className="night-red-filter" aria-hidden="true" style={{backgroundColor: `rgb(${Math.round(255 * (1 - prefs.dim / 500))}, ${Math.round(76 * (1 - prefs.dim / 500))}, ${Math.round(64 * (1 - prefs.dim / 500))})`}} />}
    </>
  );
}
