import type { Change, ChangeEvent, ChangeStatus } from "@flightdeck/shared";
import type { AgentEvent } from "../agent/types.ts";
import { publish } from "../events/index.ts";
import { capMessage, evaluateSpend } from "./caps.ts";
import { eventCost } from "./script.ts";
import { addEvent, getChange, saveChange } from "./store.ts";

export function emitChange(change: Change): Change {
  saveChange(change);
  const fresh = getChange(change.id) ?? change;
  publish("change.updated", { id: fresh.id, change: fresh });
  return Object.assign(change, fresh);
}

export function log(change: Change, ev: Omit<ChangeEvent, "id" | "at">): ChangeEvent {
  const row = addEvent(change, ev);
  emitChange(change);
  return row;
}

export function applyAgentEvent(change: Change, ev: AgentEvent): "ask" | "cap" | "ok" {
  const add = eventCost(ev);
  if (add > 0 && applySpend(change, add) === "cap") return "cap";
  if (ev.kind === "ask" && ev.ask) {
    change.status = "asking";
    change.ask = ev.ask;
    log(change, { kind: "ask", title: ev.title, detail: ev.ask.prompt, ask: ev.ask });
    return "ask";
  }
  if (ev.kind === "text" || ev.kind === "tool") {
    log(change, { kind: ev.kind, title: ev.title, detail: ev.detail });
  }
  if (ev.kind === "error") {
    change.status = "error";
    log(change, { kind: "system", title: "error", detail: ev.detail ?? ev.title });
  }
  return "ok";
}

function applySpend(change: Change, add: number): "cap" | "ok" {
  const hit = evaluateSpend(change.costUsd, add);
  change.costUsd += add;
  log(change, { kind: "usage", title: "usage", detail: `+$${add.toFixed(2)} (run $${change.costUsd.toFixed(2)})`, costUsd: add });
  if (hit === "ok") return "ok";
  change.status = "cap_hit";
  change.ask = undefined;
  log(change, { kind: "system", title: "cap", detail: capMessage(hit) });
  return "cap";
}

export function setStage(change: Change, status: ChangeStatus, stage: Change["stage"], title: string, detail?: string): void {
  change.status = status;
  change.stage = stage;
  change.ask = undefined;
  log(change, { kind: "stage", title, detail });
}
