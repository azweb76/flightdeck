import type { AppEvent } from "@flightdeck/shared";

type Listener = (event: AppEvent) => void;
const listeners = new Set<Listener>();

export function publish(type: string, payload?: unknown): void {
  const event: AppEvent = { type, at: new Date().toISOString(), payload };
  for (const l of listeners) l(event);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
