import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { RunFilterParams } from "../api/client";

interface Props {
  filters: RunFilterParams;
  onChange: (next: Partial<RunFilterParams>) => void;
  showActFilter?: boolean;
}

export function FilterBar({ filters, onChange, showActFilter = true }: Props) {
  const [characters, setCharacters] = useState<string[]>([]);

  useEffect(() => {
    api.listRuns({}).then((runs) => {
      setCharacters([...new Set(runs.map((r) => r.character))].sort());
    });
  }, []);

  return (
    <div className="filter-bar">
      <label>
        Character
        <select
          value={filters.character ?? ""}
          onChange={(e) => onChange({ character: e.target.value || undefined })}
        >
          <option value="">All</option>
          {characters.map((c) => (
            <option key={c} value={c}>
              {c.replace("CHARACTER.", "")}
            </option>
          ))}
        </select>
      </label>

      {showActFilter && (
        <label>
          Act
          <select
            value={filters.act ?? ""}
            onChange={(e) => onChange({ act: e.target.value === "" ? undefined : Number(e.target.value) })}
          >
            <option value="">All</option>
            <option value={0}>Act 1</option>
            <option value={1}>Act 2</option>
            <option value={2}>Act 3</option>
          </select>
        </label>
      )}

      <label>
        Ascension min
        <input
          type="number"
          min={0}
          max={20}
          value={filters.ascensionMin ?? ""}
          onChange={(e) =>
            onChange({ ascensionMin: e.target.value === "" ? undefined : Number(e.target.value) })
          }
        />
      </label>

      <label>
        Ascension max
        <input
          type="number"
          min={0}
          max={20}
          value={filters.ascensionMax ?? ""}
          onChange={(e) =>
            onChange({ ascensionMax: e.target.value === "" ? undefined : Number(e.target.value) })
          }
        />
      </label>

      <label>
        Result
        <select
          value={filters.win === undefined ? "" : String(filters.win)}
          onChange={(e) => onChange({ win: e.target.value === "" ? undefined : e.target.value === "true" })}
        >
          <option value="">Any</option>
          <option value="true">Win</option>
          <option value="false">Loss</option>
        </select>
      </label>
    </div>
  );
}
