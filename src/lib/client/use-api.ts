"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/client/api";

export function useApi<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<T>(url);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
