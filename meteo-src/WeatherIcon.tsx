import { useId } from "react";
import { LunarMoon, lunarDescription } from "./LunarMoon";
export function WeatherIcon({
  code = 0,
  night = false,
  className = "",
  time = Date.now(),
  latitude = 40.1508,
}: {
  code?: number;
  night?: boolean;
  className?: string;
  time?: number;
  latitude?: number;
}) {
  const id = useId().replace(/:/g, "");
  const cloud = code > 0,
    rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82),
    snow = (code >= 71 && code <= 77) || code === 85 || code === 86,
    storm = code >= 95,
    fog = code === 45 || code === 48;
  // Fit each complete symbol (including precipitation) to the same63-unit square.
  const bounds = !cloud
    ? (night ? [16, 9, 58, 51] : [13, 5, 61, 53])
    : [night ? 10 : 12, 9, night ? 73 : 76,
       storm ? 70 : fog ? 67 : snow ? 66 : rain ? (night ? 69 : 61) : night ? 58 : 49];
  const [left, top, right, bottom] = bounds;
  const symbolScale = 63 / Math.max(right - left, bottom - top);
  const symbolTransform = `translate(40 35) scale(${symbolScale}) translate(${-(left + right) / 2} ${-(top + bottom) / 2})`;

  return (
    <svg
      className={"weather-icon " + (night ? "weather-night " : "") + className}
      viewBox="0 0 80 70"
      role="img"
      aria-label={
        (night ? lunarDescription(time) + " · " : "") +
        (storm ? "Trovoada" : fog ? "Nevoeiro" : snow ? "Neve" : rain ? "Chuva" : cloud ? "Céu nublado" : night ? "Céu limpo" : "Sol")
      }
    >
      {night && <title>{lunarDescription(time)}</title>}
      <defs>
        <linearGradient id={id + "c"} x2="0.3" y2="1">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#a7cce8" />
        </linearGradient>
        <linearGradient id={id + "s"} x2="0.6" y2="1">
          <stop stopColor="#ffe9a0" />
          <stop offset="1" stopColor="#ffb42c" />
        </linearGradient>
      </defs>
      <g className="weather-symbol" transform={symbolTransform}>
      {(night || (!fog && (!cloud || code < 3))) && (
        <g>
          {night ? (
            <g className="lunar-size"><LunarMoon id={id} time={time} latitude={latitude} /></g>
          ) : (
            <g>
              <g stroke="#ffd36d" strokeWidth="2.5" strokeLinecap="round">
                {Array.from({ length: 8 }, (_, i) => (
                  <path
                    key={i}
                    d="M37 5v5"
                    transform={`rotate(${i * 45} 37 29)`}
                  />
                ))}
              </g>
              <circle cx="37" cy="29" r="15" fill={`url(#${id}s)`} />
            </g>
          )}
        </g>
      )}
      {cloud && (
        <g className="weather-cloud"><path
          d="M21 49a12 12 0 0 1 0-24 17 17 0 0 1 32-5 14 14 0 1 1 6 29Z"
          transform={night ? "translate(5 15) scale(.88)" : "translate(3 0)"}
          fill={`url(#${id}c)`}
          opacity={night ? .9 : 1}
        /></g>
      )}
      {(rain || storm) && (
        <g className="weather-rain" stroke="#67caff" strokeWidth="3" strokeLinecap="round">
          <path d={night ? "m24 60-3 5" : "m24 55-3 6"} />
          <path d={night ? "m56 60-3 5" : "m56 55-3 6"} />
          {!storm && <path d={night ? "m40 60-3 5" : "m41 55-3 6"} />}
        </g>
      )}
      {storm && <path d="m43 42-11 16h9l-4 12 17-20H44l6-8" fill="#ffcf53" />}
      {fog && (
        <g stroke="#bcd5e5" strokeWidth="3" strokeLinecap="round">
          <path d="M13 53h51M20 60h43M28 67h24" />
        </g>
      )}
      {snow && (
        <g fill="#e1f3ff">
          <circle cx="25" cy="58" r="3" />
          <circle cx="43" cy="63" r="3" />
          <circle cx="60" cy="56" r="3" />
        </g>
      )}
      </g>
    </svg>
  );
}
