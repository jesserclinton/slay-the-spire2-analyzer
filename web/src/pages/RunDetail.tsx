import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type RunDetail as RunDetailData } from "../api/client";
import { formatDate, prettifyId } from "../util/format";

export function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RunDetailData | null>(null);

  useEffect(() => {
    if (!id) return;
    setData(null);
    api.getRun(id).then(setData);
  }, [id]);

  if (!data) return <p>Loading…</p>;

  const { run, floors, actSummary } = data;

  return (
    <div>
      <h1>
        {run.character.toString().replace("CHARACTER.", "")} — Ascension {String(run.ascension)} —{" "}
        {run.win ? "Win" : run.was_abandoned ? "Abandoned" : "Loss"}
      </h1>
      <p className="hint">
        {formatDate(Number(run.start_time))} · seed {String(run.seed)}
      </p>

      <h2>Per-act summary</h2>
      <table>
        <thead>
          <tr>
            <th>Act</th>
            <th>Zone</th>
            <th>Elites fought</th>
            <th>? rooms hit</th>
            <th>Monster fights</th>
            <th>Rest sites</th>
          </tr>
        </thead>
        <tbody>
          {actSummary.map((a) => (
            <tr key={a.act_index}>
              <td>{a.act_index + 1}</td>
              <td>{prettifyId(run.acts[a.act_index] ?? "")}</td>
              <td>{a.elites}</td>
              <td>{a.unknown_rooms}</td>
              <td>{a.monster_fights}</td>
              <td>{a.rest_sites}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Timeline</h2>
      <table>
        <thead>
          <tr>
            <th>Act</th>
            <th>Floor</th>
            <th>Room</th>
            <th>HP</th>
            <th>Damage taken</th>
            <th>Cards picked</th>
            <th>Relics picked</th>
          </tr>
        </thead>
        <tbody>
          {floors.map((f) => {
            const pickedCards = f.card_choices.filter((c) => c.was_picked);
            const pickedRelics = f.relic_choices.filter((r) => r.was_picked);
            return (
              <tr key={f.id}>
                <td>{f.act_index + 1}</td>
                <td>{f.floor_number}</td>
                <td>
                  {f.model_id
                    ? `${f.room_type} — ${prettifyId(f.model_id)}`
                    : f.room_type ?? f.map_point_type}
                </td>
                <td>
                  {f.current_hp}/{f.max_hp}
                </td>
                <td>{f.damage_taken || ""}</td>
                <td>{pickedCards.map((c) => prettifyId(c.card_id)).join(", ")}</td>
                <td>{pickedRelics.map((r) => prettifyId(r.relic_id)).join(", ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
