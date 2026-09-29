export interface CardRef {
  id: string;
  floor_added_to_deck?: number;
  current_upgrade_level?: number;
  props?: unknown;
}

export interface CardChoice {
  card: CardRef;
  was_picked: boolean;
}

export interface RelicChoice {
  choice: string;
  was_picked: boolean;
}

export interface PotionChoice {
  choice: string;
  was_picked: boolean;
}

export interface AncientChoice {
  TextKey: string;
  title: { key: string; table: string };
  was_chosen: boolean;
}

export interface PlayerStats {
  player_id: number;
  current_gold?: number;
  current_hp?: number;
  damage_taken?: number;
  gold_gained?: number;
  gold_lost?: number;
  gold_spent?: number;
  gold_stolen?: number;
  hp_healed?: number;
  max_hp?: number;
  max_hp_gained?: number;
  max_hp_lost?: number;
  stolen_loot?: number;
  is_affected_by_fur_coat?: boolean;
  card_choices?: CardChoice[];
  cards_gained?: CardRef[];
  cards_removed?: CardRef[];
  relic_choices?: RelicChoice[];
  potion_choices?: PotionChoice[];
  potion_used?: string[];
  potion_discarded?: string[];
  bought_relics?: string[];
  rest_site_choices?: string[];
  upgraded_cards?: string[];
  ancient_choice?: AncientChoice[];
  event_choices?: unknown[];
}

export interface Room {
  model_id?: string;
  monster_ids?: string[];
  room_type: string;
  turns_taken?: number;
}

export interface MapPointEntry {
  map_point_type: string;
  player_stats: PlayerStats[];
  rooms: Room[];
}

export interface PlayerFinal {
  character: string;
  deck: CardRef[];
  id: number;
  max_potion_slot_count?: number;
  potions?: { id: string; slot_index: number }[];
  relics: CardRef[];
}

export interface RunFile {
  acts: string[];
  ascension: number;
  build_id: string;
  game_mode: string;
  killed_by_encounter?: string;
  killed_by_event?: string;
  map_point_history: MapPointEntry[][];
  players: PlayerFinal[];
  run_time: number;
  schema_version: number;
  seed: string;
  start_time: number;
  was_abandoned: boolean;
  win: boolean;
}
