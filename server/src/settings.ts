import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDb } from "./db.js";

const HISTORY_FOLDER_KEY = "history_folder_path";

export function getSetting(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

/**
 * STS2 nests the history folder under a Steam ID and profile slot
 * (…/SlayTheSpire2/steam/<steamId>/profile1/saves/history) that vary per
 * install, so auto-detection walks that structure rather than assuming a
 * fixed path.
 */
function autoDetectHistoryFolder(): string | undefined {
  const steamRoot = path.join(os.homedir(), "AppData", "Roaming", "SlayTheSpire2", "steam");
  if (!fs.existsSync(steamRoot)) return undefined;

  for (const steamId of fs.readdirSync(steamRoot)) {
    const profilesDir = path.join(steamRoot, steamId);
    if (!fs.statSync(profilesDir).isDirectory()) continue;

    for (const profile of fs.readdirSync(profilesDir)) {
      const historyDir = path.join(profilesDir, profile, "saves", "history");
      if (fs.existsSync(historyDir)) return historyDir;
    }
  }
  return undefined;
}

export function getHistoryFolder(): string | undefined {
  const configured = getSetting(HISTORY_FOLDER_KEY);
  if (configured) return configured;

  const detected = autoDetectHistoryFolder();
  if (detected) setSetting(HISTORY_FOLDER_KEY, detected);
  return detected;
}

export function setHistoryFolder(folderPath: string): void {
  setSetting(HISTORY_FOLDER_KEY, folderPath);
}

export { HISTORY_FOLDER_KEY };
