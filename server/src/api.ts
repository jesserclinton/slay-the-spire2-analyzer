import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db.js";
import { getHistoryFolder, setHistoryFolder } from "./settings.js";
import { startWatcher } from "./watcher.js";

export const router = Router();

interface RunFilters {
  character?: string;
  act?: number;
  ascensionMin?: number;
  ascensionMax?: number;
  win?: boolean;
  dateFrom?: number;
  dateTo?: number;
}

function parseFilters(query: Record<string, unknown>): RunFilters {
  const num = (v: unknown) => (v === undefined ? undefined : Number(v));
  return {
    character: typeof query.character === "string" ? query.character : undefined,
    act: query.act !== undefined ? num(query.act) : undefined,
    ascensionMin: query.ascension_min !== undefined ? num(query.ascension_min) : undefined,
    ascensionMax: query.ascension_max !== undefined ? num(query.ascension_max) : undefined,
    win: query.win !== undefined ? query.win === "true" : undefined,
    dateFrom: query.date_from !== undefined ? num(query.date_from) : undefined,
    dateTo: query.date_to !== undefined ? num(query.date_to) : undefined,
  };
}

/** Builds a `runs`-scoped WHERE clause; `runsAlias` and `floorsAlias` let callers
 *  reuse this against queries that join floors in (for the `act` filter). */
type SqlParams = Record<string, string | number | null>;

function buildRunWhere(filters: RunFilters, runsAlias: string, floorsAlias?: string) {
  const clauses: string[] = [];
  const params: SqlParams = {};

  if (filters.character !== undefined) {
    clauses.push(`${runsAlias}.character = @character`);
    params.character = filters.character;
  }
  if (filters.ascensionMin !== undefined) {
    clauses.push(`${runsAlias}.ascension >= @ascensionMin`);
    params.ascensionMin = filters.ascensionMin;
  }
  if (filters.ascensionMax !== undefined) {
    clauses.push(`${runsAlias}.ascension <= @ascensionMax`);
    params.ascensionMax = filters.ascensionMax;
  }
  if (filters.win !== undefined) {
    clauses.push(`${runsAlias}.win = @win`);
    params.win = filters.win ? 1 : 0;
  }
  if (filters.dateFrom !== undefined) {
    clauses.push(`${runsAlias}.start_time >= @dateFrom`);
    params.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo !== undefined) {
    clauses.push(`${runsAlias}.start_time <= @dateTo`);
    params.dateTo = filters.dateTo;
  }
  if (filters.act !== undefined && floorsAlias) {
    clauses.push(`${floorsAlias}.act_index = @act`);
    params.act = filters.act;
  }

  return { whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

router.get("/runs", (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { whereSql, params } = buildRunWhere(filters, "r");
  const rows = getDb()
    .prepare(
      `SELECT r.id, r.character, r.ascension, r.win, r.was_abandoned, r.killed_by_encounter,
              r.killed_by_event, r.run_time, r.start_time, r.acts
       FROM runs r ${whereSql} ORDER BY r.start_time DESC`,
    )
    .all(params) as Record<string, unknown>[];

  res.json(rows.map((r) => ({ ...r, acts: JSON.parse(r.acts as string) })));
});

router.get("/runs/:id", (req, res) => {
  const db = getDb();
  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;
  if (!run) return res.status(404).json({ error: "run not found" });

  const floors = db
    .prepare("SELECT * FROM floors WHERE run_id = ? ORDER BY floor_number ASC")
    .all(req.params.id) as Record<string, unknown>[];

  const cardChoices = db
    .prepare("SELECT * FROM card_choices WHERE run_id = ?")
    .all(req.params.id) as Record<string, unknown>[];
  const relicChoices = db
    .prepare("SELECT * FROM relic_choices WHERE run_id = ?")
    .all(req.params.id) as Record<string, unknown>[];

  const cardsByFloor = new Map<number, unknown[]>();
  for (const c of cardChoices) {
    const list = cardsByFloor.get(c.floor_id as number) ?? [];
    list.push(c);
    cardsByFloor.set(c.floor_id as number, list);
  }
  const relicsByFloor = new Map<number, unknown[]>();
  for (const rc of relicChoices) {
    const list = relicsByFloor.get(rc.floor_id as number) ?? [];
    list.push(rc);
    relicsByFloor.set(rc.floor_id as number, list);
  }

  const floorsOut = floors.map((f) => ({
    ...f,
    monster_ids: JSON.parse(f.monster_ids as string),
    extra: JSON.parse(f.extra_json as string),
    card_choices: cardsByFloor.get(f.id as number) ?? [],
    relic_choices: relicsByFloor.get(f.id as number) ?? [],
  }));

  const actSummary = db
    .prepare(
      `SELECT act_index,
              SUM(CASE WHEN map_point_type = 'elite' THEN 1 ELSE 0 END) AS elites,
              SUM(CASE WHEN map_point_type = 'unknown' THEN 1 ELSE 0 END) AS unknown_rooms,
              SUM(CASE WHEN map_point_type = 'monster' THEN 1 ELSE 0 END) AS monster_fights,
              SUM(CASE WHEN map_point_type = 'rest_site' THEN 1 ELSE 0 END) AS rest_sites
       FROM floors WHERE run_id = ? GROUP BY act_index ORDER BY act_index`,
    )
    .all(req.params.id);

  res.json({
    run: { ...run, acts: JSON.parse(run.acts as string) },
    floors: floorsOut,
    actSummary,
  });
});

router.get("/stats/card-picks", (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { whereSql, params } = buildRunWhere(filters, "r", "f");

  const rows = getDb()
    .prepare(
      `SELECT cc.card_id,
              COUNT(*) AS offered_count,
              SUM(cc.was_picked) AS picked_count
       FROM card_choices cc
       JOIN floors f ON f.id = cc.floor_id
       JOIN runs r ON r.id = cc.run_id
       ${whereSql}
       GROUP BY cc.card_id
       ORDER BY picked_count DESC`,
    )
    .all(params) as { card_id: string; offered_count: number; picked_count: number }[];

  res.json(
    rows.map((r) => ({
      ...r,
      skipped_count: r.offered_count - r.picked_count,
      pick_rate: r.offered_count > 0 ? r.picked_count / r.offered_count : 0,
    })),
  );
});

router.get("/stats/relic-influence", (req, res) => {
  const relic = req.query.relic as string | undefined;
  if (!relic) return res.status(400).json({ error: "relic query param is required" });
  const card = req.query.card as string | undefined;

  const filters = parseFilters(req.query as Record<string, unknown>);
  const { whereSql, params } = buildRunWhere(filters, "r", "f");
  const cardClause = card ? `${whereSql ? "AND" : "WHERE"} cc.card_id = @card` : "";

  const rows = getDb()
    .prepare(
      `SELECT cc.card_id,
              SUM(CASE WHEN rr.relic_id IS NOT NULL AND f.floor_number >= rr.floor_added_to_deck THEN 1 ELSE 0 END) AS with_relic_offered,
              SUM(CASE WHEN rr.relic_id IS NOT NULL AND f.floor_number >= rr.floor_added_to_deck AND cc.was_picked = 1 THEN 1 ELSE 0 END) AS with_relic_picked,
              SUM(CASE WHEN rr.relic_id IS NULL OR f.floor_number < rr.floor_added_to_deck THEN 1 ELSE 0 END) AS without_relic_offered,
              SUM(CASE WHEN (rr.relic_id IS NULL OR f.floor_number < rr.floor_added_to_deck) AND cc.was_picked = 1 THEN 1 ELSE 0 END) AS without_relic_picked
       FROM card_choices cc
       JOIN floors f ON f.id = cc.floor_id
       JOIN runs r ON r.id = cc.run_id
       LEFT JOIN run_relics rr ON rr.run_id = cc.run_id AND rr.relic_id = @relic
       ${whereSql} ${cardClause}
       GROUP BY cc.card_id`,
    )
    .all({ ...params, relic, ...(card ? { card } : {}) }) as {
    card_id: string;
    with_relic_offered: number;
    with_relic_picked: number;
    without_relic_offered: number;
    without_relic_picked: number;
  }[];

  const result = rows
    .map((r) => {
      const withRate = r.with_relic_offered > 0 ? r.with_relic_picked / r.with_relic_offered : null;
      const withoutRate =
        r.without_relic_offered > 0 ? r.without_relic_picked / r.without_relic_offered : null;
      return {
        ...r,
        with_relic_pick_rate: withRate,
        without_relic_pick_rate: withoutRate,
        pick_rate_delta: withRate !== null && withoutRate !== null ? withRate - withoutRate : null,
      };
    })
    .sort((a, b) => Math.abs(b.pick_rate_delta ?? 0) - Math.abs(a.pick_rate_delta ?? 0));

  res.json(result);
});

router.get("/stats/damage", (req, res) => {
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { whereSql, params } = buildRunWhere(filters, "r", "f");
  const extraWhere = whereSql ? `${whereSql} AND` : "WHERE";
  const sort = req.query.sort === "damage" ? "f.damage_taken DESC" : "r.start_time ASC, f.floor_number ASC";

  const rows = getDb()
    .prepare(
      `SELECT f.id, f.run_id, f.act_index, f.floor_number, f.room_type, f.model_id, f.monster_ids,
              f.damage_taken, f.turns_taken, r.character, r.ascension, r.start_time
       FROM floors f
       JOIN runs r ON r.id = f.run_id
       ${extraWhere} f.room_type IN ('monster', 'elite', 'boss')
       ORDER BY ${sort}`,
    )
    .all(params) as Record<string, unknown>[];

  res.json(rows.map((r) => ({ ...r, monster_ids: JSON.parse(r.monster_ids as string) })));
});

router.get("/cards", (_req, res) => {
  const rows = getDb()
    .prepare("SELECT DISTINCT card_id FROM card_choices ORDER BY card_id ASC")
    .all() as { card_id: string }[];
  res.json(rows.map((r) => r.card_id));
});

router.get("/relics", (_req, res) => {
  const rows = getDb()
    .prepare("SELECT DISTINCT relic_id FROM run_relics ORDER BY relic_id ASC")
    .all() as { relic_id: string }[];
  res.json(rows.map((r) => r.relic_id));
});

router.get("/settings", (_req, res) => {
  const folder = getHistoryFolder();
  res.json({ historyFolder: folder ?? null, exists: folder ? fs.existsSync(folder) : false });
});

router.post("/settings", (req, res) => {
  const folderPath = req.body?.folderPath as string | undefined;
  if (!folderPath || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    return res.status(400).json({ error: "folderPath must be an existing directory" });
  }

  setHistoryFolder(folderPath);
  startWatcher(folderPath);
  res.json({ historyFolder: folderPath, exists: true });
});

router.get("/browse-directory", (req, res) => {
  const requested = typeof req.query.path === "string" ? req.query.path : undefined;

  if (!requested) {
    if (process.platform === "win32") {
      const drives = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((letter) =>
        fs.existsSync(`${letter}:\\`),
      );
      return res.json({ path: null, parent: null, entries: drives.map((d) => `${d}:\\`) });
    }
    return res.json({ path: null, parent: null, entries: ["/"] });
  }

  try {
    const entries = fs
      .readdirSync(requested, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));

    const parent = path.dirname(requested);
    res.json({ path: requested, parent: parent === requested ? null : parent, entries });
  } catch {
    res.status(400).json({ error: "cannot read directory", path: requested });
  }
});
