import type { PreflightGate, PreflightReport } from "@flightdeck/shared";
import { blockedBy } from "@flightdeck/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../api.ts";
import { resetRepoCatalogCache } from "../features/repos/index.ts";
import { useAppEvents } from "../useAppEvents.ts";

type PreflightApi = {
  report?: PreflightReport;
  recheck: () => Promise<void>;
  block: (gate: PreflightGate) => ReturnType<typeof blockedBy>;
};

const Ctx = createContext<PreflightApi>({ recheck: async () => undefined, block: () => undefined });

export function PreflightProvider(props: { children: ReactNode }) {
  const [report, setReport] = useState<PreflightReport>();
  const githubOk = useRef<boolean | undefined>(undefined);

  const load = useCallback(async (refresh: boolean) => {
    setReport(refresh ? await api.recheckPreflight() : await api.preflight());
  }, []);

  useEffect(() => {
    const next = report?.checks.find((check) => check.id === "github")?.ok;
    if (next === undefined) return;
    if (githubOk.current !== undefined && githubOk.current !== next) resetRepoCatalogCache();
    githubOk.current = next;
  }, [report]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useAppEvents(
    useCallback((ev) => {
      if (ev.type !== "preflight.updated") return;
      if (ev.payload && typeof ev.payload === "object" && "checks" in ev.payload) {
        setReport(ev.payload as PreflightReport);
        return;
      }
      void load(false);
    }, [load]),
  );

  const value = useMemo<PreflightApi>(
    () => ({
      report,
      recheck: () => load(true),
      block: (gate) => (report ? blockedBy(report, gate) : undefined),
    }),
    [report, load],
  );

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function usePreflight(): PreflightApi {
  return useContext(Ctx);
}
