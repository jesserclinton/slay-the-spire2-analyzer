import { useEffect, useState } from "react";
import { api, type RelicInfluenceStat } from "../api/client";
import { FilterBar } from "../components/FilterBar";
import { useRunFilters } from "../hooks/useRunFilters";
import { formatPercent, prettifyId } from "../util/format";

export function Relics() {
  const [filters, setFilters] = useRunFilters();
  const [relics, setRelics] = useState<string[]>([]);
  const [selectedRelic, setSelectedRelic] = useState("");
  const [rows, setRows] = useState<RelicInfluenceStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listRelics().then(setRelics);
  }, []);

  useEffect(() => {
    if (!selectedRelic) {
      setRows([]);
      return;
    }
    setLoading(true);
    api.relicInfluence(selectedRelic, filters).then((r) => {
      // Only worth showing cards that were actually offered on both sides of the comparison.
      setRows(r.filter((row) => row.with_relic_offered > 0 && row.without_relic_offered > 0));
      setLoading(false);
    });
  }, [selectedRelic, filters]);

  return (
    <div>
      <h1>Relic influence</h1>
      <p className="hint">
        Compares your card pick rate in runs/floors where this relic was already in your inventory
        vs. floors where it wasn't, sorted by the biggest swing.
      </p>
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="toolbar">
        <label>
          Relic
          <select value={selectedRelic} onChange={(e) => setSelectedRelic(e.target.value)}>
            <option value="">Select a relic…</option>
            {relics.map((r) => (
              <option key={r} value={r}>
                {prettifyId(r)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!selectedRelic && <p>Pick a relic to see which cards you lean toward when you have it.</p>}
      {loading && <p>Loading…</p>}

      {!loading && selectedRelic && (
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Pick rate with relic</th>
              <th>Pick rate without relic</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.card_id}>
                <td>{prettifyId(r.card_id)}</td>
                <td>
                  {formatPercent(r.with_relic_pick_rate)} ({r.with_relic_picked}/{r.with_relic_offered})
                </td>
                <td>
                  {formatPercent(r.without_relic_pick_rate)} ({r.without_relic_picked}/
                  {r.without_relic_offered})
                </td>
                <td className={r.pick_rate_delta && r.pick_rate_delta > 0 ? "positive" : "negative"}>
                  {r.pick_rate_delta !== null
                    ? `${r.pick_rate_delta > 0 ? "+" : ""}${formatPercent(r.pick_rate_delta)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
