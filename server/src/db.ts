import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  character TEXT,
  ascension INTEGER,
  build_id TEXT,
  game_mode TEXT,
  win INTEGER,
  was_abandoned INTEGER,
  killed_by_encounter TEXT,
  killed_by_event TEXT,
  run_time INTEGER,
  seed TEXT,
  schema_version INTEGER,
  start_time INTEGER,
  acts TEXT,
  raw_json TEXT,
  ingested_at TEXT
);

CREATE TABLE IF NOT EXISTS floors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  act_index INTEGER NOT NULL,
  floor_number INTEGER NOT NULL,
  map_point_type TEXT,
  room_type TEXT,
  model_id TEXT,
  monster_ids TEXT,
  turns_taken INTEGER,
  current_hp INTEGER,
  max_hp INTEGER,
  damage_taken INTEGER,
  hp_healed INTEGER,
  gold_gained INTEGER,
  gold_lost INTEGER,
  gold_spent INTEGER,
  gold_stolen INTEGER,
  stolen_loot INTEGER,
  extra_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_floors_run ON floors(run_id);
CREATE INDEX IF NOT EXISTS idx_floors_room_type ON floors(room_type);

CREATE TABLE IF NOT EXISTS card_choices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  was_picked INTEGER NOT NULL,
  floor_added_to_deck INTEGER,
  current_upgrade_level INTEGER
);
CREATE INDEX IF NOT EXISTS idx_card_choices_run ON card_choices(run_id);
CREATE INDEX IF NOT EXISTS idx_card_choices_card ON card_choices(card_id);
CREATE INDEX IF NOT EXISTS idx_card_choices_floor ON card_choices(floor_id);

CREATE TABLE IF NOT EXISTS relic_choices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  relic_id TEXT NOT NULL,
  was_picked INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_relic_choices_run ON relic_choices(run_id);
CREATE INDEX IF NOT EXISTS idx_relic_choices_relic ON relic_choices(relic_id);

CREATE TABLE IF NOT EXISTS run_relics (
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  relic_id TEXT NOT NULL,
  floor_added_to_deck INTEGER
);
CREATE INDEX IF NOT EXISTS idx_run_relics_run ON run_relics(run_id);
CREATE INDEX IF NOT EXISTS idx_run_relics_relic ON run_relics(relic_id);

CREATE TABLE IF NOT EXISTS run_deck (
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  floor_added_to_deck INTEGER,
  current_upgrade_level INTEGER
);
CREATE INDEX IF NOT EXISTS idx_run_deck_run ON run_deck(run_id);
`;

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (db) return db;

  const dataDir = path.resolve(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "runs.db");

  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);

  return db;
}
