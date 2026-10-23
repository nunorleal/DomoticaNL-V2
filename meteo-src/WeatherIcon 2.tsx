import { useId } from "react";
export function WeatherIcon({
  code = 0,
  night = false,
  className = "",
}: {
  code?: number;
  night?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const cloud = code > 0,
    rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82),
    snow = (code >= 71 && code <= 77) || code === 85 || code === 86,
    storm = code >= 95,
    fog = code === 45 || code === 48;
  return (
    <svg
      className={"weather-icon " + className}
      viewBox="0 0 80 70"
      role="img"
      aria-label={
        storm
          ? "Trovoada"
          : fog
            ? "Nevoeiro"
            : snow
              ? "Neve"
              : rain
                ? "Chuva"
                : night
                  ? "Noite"
                  : cloud
                    ? "Nuvens e sol"
                    : "Sol"
      }
    >
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
      {!fog && (!cloud || code < 3) && (
        <g>
          {night ? (
            <path
              d="M49 10a20 20 0 1 0 15 31A23 23 0 0 1 49 10"
              fill="#e7edff"
            />
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
        <path
          d="M21 49a12 12 0 0 1 0-24 17 17 0 0 1 32-5 14 14 0 1 1 6 29Z"
          transform="translate(3 0)"
          fill={`url(#${id}c)`}
        />
      )}
      {(rain || storm) && (
        <g stroke="#67caff" strokeWidth="3" strokeLinecap="round">
          <path d="m24 55-3 6m36-6-3 6" />
          {!storm && <path d="m41 55-3 6" />}
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
    </svg>
  );
}
