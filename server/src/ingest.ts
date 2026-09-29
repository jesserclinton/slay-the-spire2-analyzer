import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db.js";
import type { MapPointEntry, PlayerStats, RunFile } from "./types.js";

function pickPlayerStats(entry: MapPointEntry, playerId: number): PlayerStats | undefined {
  return entry.player_stats.find((p) => p.player_id === playerId) ?? entry.player_stats[0];
}

export function ingestRunFile(filePath: string): { runId: string; skipped: boolean } {
  const runId = path.basename(filePath, ".run");

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return { runId, skipped: true };
  }

  let data: RunFile;
  try {
    data = JSON.parse(raw);
  } catch {
    // STS2 can be mid-write when the watcher fires; skip malformed reads,
    // the file will be picked up again on its next "change" event.
    return { runId, skipped: true };
  }

  const db = getDb();
  const player = data.players?.[0];
  if (!player) return { runId, skipped: true };

  const insertRun = db.prepare(`
    INSERT INTO runs (id, character, ascension, build_id, game_mode, win, was_abandoned,
      killed_by_encounter, killed_by_event, run_time, seed, schema_version, start_time, acts, raw_json, ingested_at)
    VALUES (@id, @character, @ascension, @build_id, @game_mode, @win, @was_abandoned,
      @killed_by_encounter, @killed_by_event, @run_time, @seed, @schema_version, @start_time, @acts, @raw_json, @ingested_at)
  `);

  const insertFloor = db.prepare(`
    INSERT INTO floors (run_id, act_index, floor_number, map_point_type, room_type, model_id,
      monster_ids, turns_taken, current_hp, max_hp, damage_taken, hp_healed, gold_gained,
      gold_lost, gold_spent, gold_stolen, stolen_loot, extra_json)
    VALUES (@run_id, @act_index, @floor_number, @map_point_type, @room_type, @model_id,
      @monster_ids, @turns_taken, @current_hp, @max_hp, @damage_taken, @hp_healed, @gold_gained,
      @gold_lost, @gold_spent, @gold_stolen, @stolen_loot, @extra_json)
  `);

  const insertCardChoice = db.prepare(`
    INSERT INTO card_choices (floor_id, run_id, card_id, was_picked, floor_added_to_deck, current_upgrade_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertRelicChoice = db.prepare(`
    INSERT INTO relic_choices (floor_id, run_id, relic_id, was_picked)
    VALUES (?, ?, ?, ?)
  `);

  const insertRunRelic = db.prepare(`
    INSERT INTO run_relics (run_id, relic_id, floor_added_to_deck) VALUES (?, ?, ?)
  `);

  const insertRunDeckCard = db.prepare(`
    INSERT INTO run_deck (run_id, card_id, floor_added_to_deck, current_upgrade_level) VALUES (?, ?, ?, ?)
  `);

  const deleteExisting = db.prepare("DELETE FROM runs WHERE id = ?");

  const runIngest = () => {
    deleteExisting.run(runId);

    insertRun.run({
      id: runId,
      character: player.character,
      ascension: data.ascension,
      build_id: data.build_id,
      game_mode: data.game_mode,
      win: data.win ? 1 : 0,
      was_abandoned: data.was_abandoned ? 1 : 0,
      killed_by_encounter: data.killed_by_encounter ?? null,
      killed_by_event: data.killed_by_event ?? null,
      run_time: data.run_time,
      seed: data.seed,
      schema_version: data.schema_version,
      start_time: data.start_time,
      acts: JSON.stringify(data.acts ?? []),
      raw_json: raw,
      ingested_at: new Date().toISOString(),
    });

    let floorNumber = 0;
    for (let actIndex = 0; actIndex < data.map_point_history.length; actIndex++) {
      const act = data.map_point_history[actIndex];
      for (const entry of act) {
        floorNumber += 1;
        const room = entry.rooms?.[0];
        const stats = pickPlayerStats(entry, player.id) ?? ({} as PlayerStats);

        const floorResult = insertFloor.run({
          run_id: runId,
          act_index: actIndex,
          floor_number: floorNumber,
          map_point_type: entry.map_point_type,
          room_type: room?.room_type ?? null,
          model_id: room?.model_id ?? null,
          monster_ids: JSON.stringify(room?.monster_ids ?? []),
          turns_taken: room?.turns_taken ?? null,
          current_hp: stats.current_hp ?? null,
          max_hp: stats.max_hp ?? null,
          damage_taken: stats.damage_taken ?? 0,
          hp_healed: stats.hp_healed ?? 0,
          gold_gained: stats.gold_gained ?? 0,
          gold_lost: stats.gold_lost ?? 0,
          gold_spent: stats.gold_spent ?? 0,
          gold_stolen: stats.gold_stolen ?? 0,
          stolen_loot: stats.stolen_loot ?? 0,
          extra_json: JSON.stringify({
            event_choices: stats.event_choices,
            ancient_choice: stats.ancient_choice,
            rest_site_choices: stats.rest_site_choices,
            upgraded_cards: stats.upgraded_cards,
            bought_relics: stats.bought_relics,
            potion_choices: stats.potion_choices,
            potion_used: stats.potion_used,
            potion_discarded: stats.potion_discarded,
            cards_gained: stats.cards_gained,
            cards_removed: stats.cards_removed,
            current_gold: stats.current_gold,
            max_hp_gained: stats.max_hp_gained,
            max_hp_lost: stats.max_hp_lost,
            is_affected_by_fur_coat: stats.is_affected_by_fur_coat,
          }),
        });
        const floorId = floorResult.lastInsertRowid as number;

        for (const choice of stats.card_choices ?? []) {
          insertCardChoice.run(
            floorId,
            runId,
            choice.card.id,
            choice.was_picked ? 1 : 0,
            choice.card.floor_added_to_deck ?? null,
            choice.card.current_upgrade_level ?? null,
          );
        }

        for (const choice of stats.relic_choices ?? []) {
          insertRelicChoice.run(floorId, runId, choice.choice, choice.was_picked ? 1 : 0);
        }
      }
    }

    for (const relic of player.relics ?? []) {
      insertRunRelic.run(runId, relic.id, relic.floor_added_to_deck ?? null);
    }

    for (const card of player.deck ?? []) {
      insertRunDeckCard.run(runId, card.id, card.floor_added_to_deck ?? null, card.current_upgrade_level ?? null);
    }
  };

  db.exec("BEGIN");
  try {
    runIngest();
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return { runId, skipped: false };
}

export function ingestHistoryFolder(historyDir: string): { ingested: number; failed: number } {
  if (!fs.existsSync(historyDir)) return { ingested: 0, failed: 0 };

  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".run"));

  let ingested = 0;
  let failed = 0;
  for (const file of files) {
    const result = ingestRunFile(path.join(historyDir, file));
    if (result.skipped) failed += 1;
    else ingested += 1;
  }
  return { ingested, failed };
}
