import { useEffect, useRef, useState } from "react";
import { createFocus } from "../meteo-focus-core.js";
import { bridge } from "./bridge";

export function useFocusView(seconds: number, settingsOpen: boolean) {
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof createFocus> | null>(null);
  useEffect(() => {
    const controller = createFocus({ seconds });
    timer.current = controller;
    setExpanded(false);
    const activity = () => controller.activity();
    const visibility = () => { controller.wake(); setExpanded(false); };
    const events = ["pointerdown", "pointermove", "keydown", "wheel"];
    for (const event of events) document.addEventListener(event, activity, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    const interval = window.setInterval(() => {
      const blocked = settingsOpen || document.hidden || bridge?.visible?.() === false;
      setExpanded(controller.tick(blocked));
    }, 250);
    return () => {
      window.clearInterval(interval);
      for (const event of events) document.removeEventListener(event, activity);
      document.removeEventListener("visibilitychange", visibility);
      if (timer.current === controller) timer.current = null;
    };
  }, [seconds, settingsOpen]);
  const wake = () => { timer.current?.wake(); setExpanded(false); };
  return { expanded, wake };
}
