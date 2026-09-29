import { useEffect, useMemo, useState } from "react";
import { api, type CardPickStat } from "../api/client";
import { FilterBar } from "../components/FilterBar";
import { useRunFilters } from "../hooks/useRunFilters";
import { formatPercent, prettifyId } from "../util/format";

type SortKey = "pick_rate" | "offered_count" | "picked_count";

export function CardPicks() {
  const [filters, setFilters] = useRunFilters();
  const [rows, setRows] = useState<CardPickStat[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("offered_count");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.cardPicks(filters).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [filters]);

  const displayed = useMemo(() => {
    const filtered = search
      ? rows.filter((r) => r.card_id.toLowerCase().includes(search.toLowerCase()))
      : rows;
    return [...filtered].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [rows, search, sortKey]);

  return (
    <div>
      <h1>Card picks</h1>
      <p className="hint">
        Pick rate = times picked ÷ times offered. Filter by act to see what you favor early vs. late.
      </p>
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search cards…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label>
          Sort by
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="offered_count">Times offered</option>
            <option value="pick_rate">Pick rate</option>
            <option value="picked_count">Times picked</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Offered</th>
              <th>Picked</th>
              <th>Skipped</th>
              <th>Pick rate</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r) => (
              <tr key={r.card_id}>
                <td>{prettifyId(r.card_id)}</td>
                <td>{r.offered_count}</td>
                <td>{r.picked_count}</td>
                <td>{r.skipped_count}</td>
                <td>{formatPercent(r.pick_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
