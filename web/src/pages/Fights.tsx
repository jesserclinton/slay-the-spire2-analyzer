import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DamageRow } from "../api/client";
import { FilterBar } from "../components/FilterBar";
import { useRunFilters } from "../hooks/useRunFilters";
import { formatDate, prettifyId } from "../util/format";

export function Fights() {
  const [filters, setFilters] = useRunFilters();
  const [sort, setSort] = useState<"floor" | "damage">("damage");
  const [rows, setRows] = useState<DamageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.damage(filters, sort).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [filters, sort]);

  return (
    <div>
      <h1>Damage taken per fight</h1>
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="toolbar">
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as "floor" | "damage")}>
            <option value="damage">Damage taken (highest first)</option>
            <option value="floor">Floor (sequential)</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Character</th>
              <th>Asc.</th>
              <th>Act</th>
              <th>Floor</th>
              <th>Room</th>
              <th>Encounter</th>
              <th>Turns</th>
              <th>Damage taken</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/runs/${r.run_id}`}>{formatDate(r.start_time)}</Link>
                </td>
                <td>{r.character.replace("CHARACTER.", "")}</td>
                <td>{r.ascension}</td>
                <td>{r.act_index + 1}</td>
                <td>{r.floor_number}</td>
                <td>{r.room_type}</td>
                <td>{r.model_id ? prettifyId(r.model_id) : r.monster_ids.map(prettifyId).join(", ")}</td>
                <td>{r.turns_taken}</td>
                <td>{r.damage_taken}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
