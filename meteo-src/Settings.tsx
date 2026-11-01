import { install as installDismiss } from "../dialog-dismiss.js";
import { bridge, openCasaSettings } from "./bridge";
import { fetchJson } from "./network";
import { useEffect, useRef, useState } from "react";
import { X, Search, MapPin, Check } from "lucide-react";
import type { Settings as Prefs } from "./storage";
import { scenes, type City } from "./weather";
export function Settings({
  value,
  onChange,
  onClose,
}: {
  value: Prefs;
  onChange: (s: Prefs) => void;
  onClose: () => void;
}) {
  const blind = bridge?.bedroomBlind?.();
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<City[]>([]),
    [searchState, setSearchState] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    searchId = useRef(0);
  const set = <K extends keyof Prefs>(key: K, v: Prefs[K]) =>
    onChange({ ...value, [key]: v });
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    const cleanup = el ? installDismiss(el, onClose) : () => {};
    return () => { cleanup(); el?.close(); };
  }, []);
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
      <div className="settings-body">
        <section><h3>Conta e candeeiro Shelly</h3><p>Usam a configuração da Casa NL e o candeeiro do quarto principal.</p><button className="shared-settings-button" onClick={openCasaSettings}>Configurar na Casa NL</button></section>
        <section>
          <h3>Localização</h3>
          <p className="selected-city">
            <MapPin size={17} />
            {value.city.name}
            <Check size={16} />
          </p>
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
        </section>
        <section>
          <h3>Relógio e unidades</h3>
          <label>
            Ampliar relógio após inatividade
            <select value={value.focusSeconds} onChange={(e) => set("focusSeconds", Number(e.target.value))}>
              <option value={0}>Desativado</option>
              <option value={15}>15 segundos</option>
              <option value={30}>30 segundos</option>
              <option value={60}>1 minuto</option>
              <option value={120}>2 minutos</option>
              <option value={300}>5 minutos</option>
            </select>
          </label>
          <p>Amplia a data, o relógio e a meteorologia. Um toque devolve a vista normal. A ampliação fica suspensa enquanto estiver nas definições.</p>
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
        </section>
        <section>
          <h3>Paisagem e movimento</h3>
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
            Intensidade dos efeitos
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
        </section>
        <section>
          <h3>Modo de cabeceira</h3>
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
            Manter modo noturno até o estore do quarto abrir a 100%
            <input type="checkbox" checked={value.nightUntilBlindOpen} onChange={e => set("nightUntilBlindOpen", e.target.checked)} />
          </label>
          {value.nightUntilBlindOpen && <p role="status">{!blind?.configured ? "Associe o estore do quarto principal nas definições da Casa NL para permitir a saída automática." : !blind.ready ? "A aguardar uma leitura atual do estore; dados antigos ou indisponíveis não libertam o modo." : `Estore do quarto principal: ${blind.position}%.`}</p>}
          <p>Aplica-se ao vermelho e ao modo noturno. O horário ativa o modo; a saída espera uma leitura atual do estore do quarto principal totalmente aberto. Depois de sair, fechar o estore não volta a ativar o modo.</p>
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
        </section>
        <section>
          <h3>Viajar pela paisagem</h3>
          <p>
            Pré-visualize os ambientes. A hora e os dados meteorológicos
            mantêm-se reais.
          </p>
          <div className="scene-options">
            <button
              className={value.demo === "auto" ? "active" : ""}
              onClick={() => set("demo", "auto")}
            >
              Tempo real
            </button>
            {Object.entries(scenes).map(([key, title]) => (
              <button
                className={value.demo === key ? "active" : ""}
                key={key}
                onClick={() => set("demo", key as Prefs["demo"])}
              >
                {title}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h3>Instalar no iPad</h3>
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
        </section>
      </div>
      <footer>Guardado automaticamente neste dispositivo</footer>
    </dialog>
  );
}
