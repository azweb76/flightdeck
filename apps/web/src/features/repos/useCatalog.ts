import { useCallback, useEffect, useState } from "react";
import type { CatalogRepo } from "@flightdeck/shared";
import { api, subscribeEvents } from "../api/index.ts";

export function useCatalog() {
  const [repos, setRepos] = useState<CatalogRepo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const next = refresh ? await api.refreshRepos() : await api.repos();
      setRepos(next.repos);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return subscribeEvents((type) => {
      if (!type || type === "repos.updated") void load();
    });
  }, [load]);

  async function toggleFavorite(repo: CatalogRepo) {
    const next = await api.favoriteRepo(repo.owner, repo.name, !repo.favorite);
    setRepos(next.repos);
  }

  return { repos, refreshing, load, toggleFavorite };
}
