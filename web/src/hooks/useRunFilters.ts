import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { RunFilterParams } from "../api/client";

export function useRunFilters(): [RunFilterParams, (next: Partial<RunFilterParams>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<RunFilterParams>(() => {
    const act = searchParams.get("act");
    const ascensionMin = searchParams.get("ascensionMin");
    const ascensionMax = searchParams.get("ascensionMax");
    const win = searchParams.get("win");
    return {
      character: searchParams.get("character") ?? undefined,
      act: act !== null ? Number(act) : undefined,
      ascensionMin: ascensionMin !== null ? Number(ascensionMin) : undefined,
      ascensionMax: ascensionMax !== null ? Number(ascensionMax) : undefined,
      win: win !== null ? win === "true" : undefined,
    };
  }, [searchParams]);

  const update = (next: Partial<RunFilterParams>) => {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    setSearchParams(params, { replace: true });
  };

  return [filters, update];
}
