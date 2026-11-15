import { useEffect, useState } from "react";
import {
  ensureRepoCatalog,
  refreshRepoCatalog,
  repoCatalogSnapshot,
  shouldAutoLoadCatalog,
  subscribeRepoCatalog,
  toggleRepoFavorite,
} from "./cache.ts";

export function useRepoCatalog() {
  const [, setTick] = useState(0);
  useEffect(() => subscribeRepoCatalog(() => setTick((n) => n + 1)), []);
  useEffect(() => {
    void ensureRepoCatalog().catch(() => undefined);
  }, []);
  const snap = repoCatalogSnapshot();
  useEffect(() => {
    if (!shouldAutoLoadCatalog(snap)) return;
    void ensureRepoCatalog().catch(() => undefined);
  }, [snap.data, snap.loading, snap.inflight, snap.error]);
  return {
    catalog: snap.data,
    loading: snap.loading && !snap.data,
    refreshing: snap.loading,
    error: snap.error,
    refresh: () => refreshRepoCatalog(true).catch(() => undefined),
    favorite: (owner: string, name: string, on: boolean) => toggleRepoFavorite(owner, name, on),
  };
}
