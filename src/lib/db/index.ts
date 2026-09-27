import Dexie, { type Table } from 'dexie';
import type {
  User,
  UserSettings,
  Trade,
  CustomColumn,
  SelectOption,
  TradeCustomValue,
  TradeImage,
  SyncOperation,
} from '@/types';

export interface OfflineBlob {
  id: string; // storage_path
  data: Blob;
  mime_type: string;
  updated_at: string;
}

export class BacktestDatabase extends Dexie {
  users!: Table<User, string>;
  user_settings!: Table<UserSettings, string>;
  trades!: Table<Trade, string>;
  custom_columns!: Table<CustomColumn, string>;
  select_options!: Table<SelectOption, string>;
  trade_custom_values!: Table<TradeCustomValue, string>;
  trade_images!: Table<TradeImage, string>;
  sync_queue!: Table<SyncOperation, string>;
  offline_blobs!: Table<OfflineBlob, string>;

  constructor() {
    super('JournalDeBacktestDB');

    this.version(1).stores({
      users: 'id, username',
      user_settings: 'id, user_id',
      trades: 'id, user_id, trade_number, date, asset, position, result, session, duration, deleted_at, sync_status, updated_at',
      custom_columns: 'id, user_id, sort_order, is_visible',
      select_options: 'id, column_id, system_column_key, user_id, sort_order',
      trade_custom_values: 'id, trade_id, column_id, [trade_id+column_id]',
      trade_images: 'id, trade_id, user_id, storage_path, deleted_at, sort_order',
      sync_queue: 'id, user_id, status, client_timestamp, entity_type',
      offline_blobs: 'id, updated_at',
    });
  }
}

export const db = new BacktestDatabase();
