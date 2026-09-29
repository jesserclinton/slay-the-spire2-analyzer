import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { api, type RunSummary } from "../api/client";
import { FilterBar } from "../components/FilterBar";
import { useRunFilters } from "../hooks/useRunFilters";
import { formatDate } from "../util/format";

export function Overview() {
  const [filters, setFilters] = useRunFilters();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listRuns(filters).then((r) => {
      setRuns(r);
      setLoading(false);
    });
  }, [filters]);

  const stats = useMemo(() => {
    const total = runs.length;
    const wins = runs.filter((r) => r.win === 1).length;
    return { total, wins, winRate: total > 0 ? wins / total : 0 };
  }, [runs]);

  const ascensionChartData = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of runs) counts.set(r.ascension, (counts.get(r.ascension) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ascension, count]) => ({ ascension: `A${ascension}`, count }));
  }, [runs]);

  return (
    <div>
      <h1>Overview</h1>
      <FilterBar filters={filters} onChange={setFilters} showActFilter={false} />

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="stat-tiles">
            <div className="stat-tile">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Runs</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{stats.wins}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{(stats.winRate * 100).toFixed(1)}%</span>
              <span className="stat-label">Win rate</span>
            </div>
          </div>

          <h2>Runs by ascension</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={ascensionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ascension" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2>Recent runs</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Character</th>
                <th>Ascension</th>
                <th>Result</th>
                <th>Died to</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 50).map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/runs/${r.id}`}>{formatDate(r.start_time)}</Link>
                  </td>
                  <td>{r.character.replace("CHARACTER.", "")}</td>
                  <td>{r.ascension}</td>
                  <td>{r.win ? "Win" : r.was_abandoned ? "Abandoned" : "Loss"}</td>
                  <td>{r.killed_by_encounter?.replace("ENCOUNTER.", "") ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
