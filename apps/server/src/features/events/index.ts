import type { AppEvent } from "@flightdeck/shared";

type Listener = (event: AppEvent) => void;

const listeners = new Set<Listener>();

export function publish(type: AppEvent["type"]): void {
  const event: AppEvent = { type, at: new Date().toISOString() };
  for (const l of listeners) l(event);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
