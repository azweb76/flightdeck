import type { AppEvent, ShapeSession } from "@flightdeck/shared";
import { useEffect } from "react";

export function useAppEvents(onEvent: (ev: AppEvent) => void): void {
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (msg) => {
      if (!msg.data) return;
      try {
        onEvent(JSON.parse(msg.data) as AppEvent);
      } catch {
        /* ignore malformed SSE */
      }
    };
    return () => es.close();
  }, [onEvent]);
}

export function sessionFromEvent(ev: AppEvent, id: string): ShapeSession | undefined {
  if (ev.type !== "shape.updated") return undefined;
  const payload = ev.payload as { id?: string; session?: ShapeSession } | undefined;
  if (payload?.session?.id === id) return payload.session;
  return undefined;
}
