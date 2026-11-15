import { useEffect, useState } from "react";
import {
  REPOS_QUERY_KEY,
  ensureRepoCatalog,
  refreshRepoCatalog,
  repoCatalogSnapshot,
  subscribeRepoCatalog,
  toggleRepoFavorite,
} from "./cache.ts";

export function useRepoCatalog() {
  const [, setTick] = useState(0);
  useEffect(() => subscribeRepoCatalog(() => setTick((n) => n + 1)), []);
  useEffect(() => {
    void ensureRepoCatalog();
  }, []);
  const snap = repoCatalogSnapshot();
  return {
    queryKey: REPOS_QUERY_KEY,
    catalog: snap.data,
    loading: snap.loading && !snap.data,
    refreshing: snap.loading,
    error: snap.error,
    refresh: () => refreshRepoCatalog(true),
    favorite: (owner: string, name: string, on: boolean) => toggleRepoFavorite(owner, name, on),
  };
}
