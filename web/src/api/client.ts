export interface RunSummary {
  id: string;
  character: string;
  ascension: number;
  win: number;
  was_abandoned: number;
  killed_by_encounter: string | null;
  killed_by_event: string | null;
  run_time: number;
  start_time: number;
  acts: string[];
}

export interface RunFilterParams {
  character?: string;
  act?: number;
  ascensionMin?: number;
  ascensionMax?: number;
  win?: boolean;
}

export interface CardPickStat {
  card_id: string;
  offered_count: number;
  picked_count: number;
  skipped_count: number;
  pick_rate: number;
}

export interface RelicInfluenceStat {
  card_id: string;
  with_relic_offered: number;
  with_relic_picked: number;
  without_relic_offered: number;
  without_relic_picked: number;
  with_relic_pick_rate: number | null;
  without_relic_pick_rate: number | null;
  pick_rate_delta: number | null;
}

export interface DamageRow {
  id: number;
  run_id: string;
  act_index: number;
  floor_number: number;
  room_type: string;
  model_id: string | null;
  monster_ids: string[];
  damage_taken: number;
  turns_taken: number;
  character: string;
  ascension: number;
  start_time: number;
}

export interface FloorDetail {
  id: number;
  act_index: number;
  floor_number: number;
  map_point_type: string;
  room_type: string | null;
  model_id: string | null;
  monster_ids: string[];
  turns_taken: number | null;
  current_hp: number | null;
  max_hp: number | null;
  damage_taken: number;
  hp_healed: number;
  gold_gained: number;
  gold_lost: number;
  gold_spent: number;
  gold_stolen: number;
  extra: Record<string, unknown>;
  card_choices: { card_id: string; was_picked: number; floor_added_to_deck: number | null }[];
  relic_choices: { relic_id: string; was_picked: number }[];
}

export interface ActSummaryRow {
  act_index: number;
  elites: number;
  unknown_rooms: number;
  monster_fights: number;
  rest_sites: number;
}

export interface RunDetail {
  run: Record<string, unknown> & { id: string; character: string; acts: string[] };
  floors: FloorDetail[];
  actSummary: ActSummaryRow[];
}

export interface SettingsResponse {
  historyFolder: string | null;
  exists: boolean;
}

export interface BrowseDirectoryResponse {
  path: string | null;
  parent: string | null;
  entries: string[];
  error?: string;
}

function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function filterQuery(filters: RunFilterParams) {
  return {
    character: filters.character,
    act: filters.act,
    ascension_min: filters.ascensionMin,
    ascension_max: filters.ascensionMax,
    win: filters.win === undefined ? undefined : String(filters.win),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  listRuns: (filters: RunFilterParams) =>
    getJson<RunSummary[]>(`/api/runs${toQuery(filterQuery(filters))}`),

  getRun: (id: string) => getJson<RunDetail>(`/api/runs/${encodeURIComponent(id)}`),

  cardPicks: (filters: RunFilterParams) =>
    getJson<CardPickStat[]>(`/api/stats/card-picks${toQuery(filterQuery(filters))}`),

  relicInfluence: (relic: string, filters: RunFilterParams, card?: string) =>
    getJson<RelicInfluenceStat[]>(
      `/api/stats/relic-influence${toQuery({ ...filterQuery(filters), relic, card })}`,
    ),

  damage: (filters: RunFilterParams, sort: "floor" | "damage") =>
    getJson<DamageRow[]>(`/api/stats/damage${toQuery({ ...filterQuery(filters), sort })}`),

  listCards: () => getJson<string[]>("/api/cards"),

  listRelics: () => getJson<string[]>("/api/relics"),

  getSettings: () => getJson<SettingsResponse>("/api/settings"),

  setSettings: async (folderPath: string) => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "failed to save settings");
    return res.json() as Promise<SettingsResponse>;
  },

  browseDirectory: (dirPath?: string) =>
    getJson<BrowseDirectoryResponse>(`/api/browse-directory${toQuery({ path: dirPath })}`),
};
