import { useState, type CSSProperties } from "react";

// Stable for this rain spell: clock renders never redistribute the droplets.
export function ScreenRain({ animate, intensity }: { animate: boolean; intensity: number }) {
  const [drops] = useState(() => Array.from({ length: 18 }, (_, i) => ({
    x: (i % 6 + .15 + Math.random() * .7) / 6 * 100,
    y: (Math.floor(i / 6) + .1 + Math.random() * .8) / 3 * 100,
    size: 9 + Math.random() * 18,
    stretch: 1 + Math.random() * .4,
    delay: -Math.random() * 30,
    duration: 22 + Math.random() * 18,
  })));
  return <div className={"screen-rain" + (animate ? " is-animated" : "")}
    aria-hidden="true" style={{ opacity: .35 + intensity / 100 * .65 }}>
    {drops.map((drop, i) => <i key={i} className="screen-raindrop" style={{
      left: `${drop.x}%`, top: `${drop.y}%`, width: drop.size,
      height: drop.size * drop.stretch,
      "--drop-delay": `${drop.delay}s`, "--drop-duration": `${drop.duration}s`,
    } as CSSProperties} />)}
  </div>;
}
