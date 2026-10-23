import { useEffect, useState } from "react";
import { bridge } from "./bridge";
const unavailable = { configured: false, temperature: null as number | null, status: "unconfigured" };
export function RealTemperature({ unit }: { unit: "C" | "F" }) {
  const [reading, setReading] = useState(() => bridge?.realTemperature?.() ?? unavailable);
  useEffect(() => {
    const timer = window.setInterval(() => setReading(bridge?.realTemperature?.() ?? unavailable), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!reading.configured) return null;
  const measured = typeof reading.temperature === "number" && Number.isFinite(reading.temperature);
  const value = measured ? (unit === "F" ? reading.temperature * 9 / 5 + 32 : reading.temperature).toLocaleString("pt-PT", { maximumFractionDigits: 1 }) : "—";
  const status = reading.status === "last" ? "Última leitura" : reading.status === "pending" ? "Por consultar" : !measured ? "Indisponível" : "";
  return <div className="real-temperature" data-status={reading.status} aria-label={`Temperatura real medida pelo sensor: ${value} graus ${unit === "C" ? "Celsius" : "Fahrenheit"}${status ? ", " + status : ""}`}>
    <span>Real</span><strong>{value} °{unit}</strong>{status && <small>{status}</small>}
  </div>;
}
