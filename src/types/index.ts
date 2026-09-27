export type PositionType = 'BUY' | 'SELL';
export type ResultType = 'TP' | 'SL' | 'BE';

export type ColumnDataType = 
  | 'TEXT' 
  | 'NUMBER' 
  | 'SELECT' 
  | 'MULTI-SELECT' 
  | 'DATE' 
  | 'CHECKBOX';

export interface User {
  id: string;
  username: string; // e.g. "BINI_JR" | "LINHO"
  password_hash: string;
  role: 'associate' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  table_preferences?: {
    columnOrder?: string[];
    hiddenColumns?: string[];
    columnWidths?: Record<string, number>;
  };
  backup_frequency?: string;
  updated_at: string;
}

export interface Trade {
  id: string; // UUID v4 internal
  user_id: string; // Owner associate
  trade_number: number; // 1, 2, 3...
  date: string; // YYYY-MM-DD
  asset: string; // XAUUSD, EURUSD, etc.
  position: PositionType; // BUY, SELL
  result: ResultType; // TP, SL, BE
  rr: number; // Numeric pure (e.g. 2.50, -1.00, 0.00)
  session: string; // LONDON, NEW YORK, ASIAN, LON-NEW...
  duration: string; // 0-15, 15-30, 30-60, 60-180, 180-360...
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null; // For soft delete / trash
  version: number;
  sync_status?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface CustomColumn {
  id: string; // UUID
  user_id: string;
  name: string;
  type: ColumnDataType;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface SelectOption {
  id: string; // UUID
  column_id?: string | null; // NULL for system columns like 'asset', 'session', etc.
  system_column_key?: string | null; // 'asset', 'session', 'duration', etc.
  user_id: string;
  label: string;
  color: string; // Hex color e.g. '#10B981'
  sort_order: number;
  created_at: string;
}

export interface TradeCustomValue {
  id: string;
  trade_id: string;
  column_id: string;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_boolean?: boolean;
  value_json?: string[]; // Array of selected option IDs or labels for MULTI-SELECT
  updated_at: string;
}

export interface TradeImage {
  id: string;
  trade_id: string;
  user_id: string;
  file_name: string; // e.g. 'image_01.webp'
  storage_path: string; // e.g. 'BINI_JR/2026-09-26/TRADE_000125/image_01.webp'
  thumbnail_path?: string; // e.g. 'BINI_JR/2026-09-26/TRADE_000125/thumb_01.webp'
  mime_type: string;
  file_size: number;
  comment: string; // Extensible per-image comment
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Local cache / preview blob
  data_url?: string;
  thumbnail_data_url?: string;
}

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'greater_than' 
  | 'less_than' 
  | 'in' 
  | 'is_empty' 
  | 'is_not_empty';

export interface FilterCondition {
  id: string;
  columnKey: string; // 'asset', 'result', 'session', or custom_column_id
  operator: FilterOperator;
  value: any;
}

export interface FilterGroup {
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}

export interface SortConfig {
  columnKey: string;
  direction: 'asc' | 'desc';
}

export interface TradeStats {
  totalTrades: number;
  totalTP: number;
  totalSL: number;
  totalBE: number;
  winrate: number; // percentage (0-100)
  maxWinningStreak: number;
  maxLosingStreak: number;
  maxDrawdownR: number;
  profitFactor: number;
  expectancy: number; // Expected R per trade
  averageWinR: number;
  averageLossR: number;
  averageRetentionTime: string;
  totalR: number;
  averageRR: number;
}

export interface SyncOperation {
  id: string;
  user_id: string;
  entity_type: 'trade' | 'custom_column' | 'select_option' | 'trade_custom_value' | 'trade_image' | 'user_settings';
  entity_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  client_timestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'conflict';
}

export interface BackupManifest {
  version: string;
  app: string;
  created_at: string;
  user: {
    id: string;
    username: string;
  };
  stats: {
    total_trades: number;
    total_images: number;
    total_custom_columns: number;
    date_range_start?: string;
    date_range_end?: string;
  };
  checksums: Record<string, string>;
}
