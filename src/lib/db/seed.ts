import { db } from './index';
import { hashPassword, generateUUID } from '@/utils/crypto';
import type { User, CustomColumn, SelectOption, Trade, TradeCustomValue } from '@/types';

export async function initializeDatabase(): Promise<void> {
  const usersCount = await db.users.count();

  // Migration: rehash all default passwords with the current algorithm
  // This fixes login issues when the hashing method changes (e.g. crypto.subtle -> standalone SHA-256)
  const migrationKey = 'password_hash_migrated_v2';
  if (usersCount > 0 && !localStorage.getItem(migrationKey)) {
    console.log('[DB] Migrating password hashes to current algorithm...');
    const defaultPassword = 'password123';
    const newHash = await hashPassword(defaultPassword);
    const allUsers = await db.users.toArray();
    for (const user of allUsers) {
      await db.users.update(user.id, { password_hash: newHash });
    }
    localStorage.setItem(migrationKey, 'true');
    console.log('[DB] Password hash migration complete.');
    return;
  }

  if (usersCount > 0) {
    return; // Already initialized
  }

  console.log('[DB] Initializing default associates and dataset...');

  const defaultPassword = 'password123';
  const hashedPassword = await hashPassword(defaultPassword);

  const biniId = 'user-bini-jr';
  const linhoId = 'user-linho';

  const initialUsers: User[] = [
    {
      id: biniId,
      username: 'BINI_JR',
      password_hash: hashedPassword,
      role: 'associate',
      created_at: new Date('2006-01-01T00:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: linhoId,
      username: 'LINHO',
      password_hash: hashedPassword,
      role: 'associate',
      created_at: new Date('2006-01-01T00:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  await db.users.bulkAdd(initialUsers);

  // Settings
  await db.user_settings.bulkAdd([
    {
      id: `settings-${biniId}`,
      user_id: biniId,
      theme: 'dark',
      table_preferences: {},
      updated_at: new Date().toISOString(),
    },
    {
      id: `settings-${linhoId}`,
      user_id: linhoId,
      theme: 'dark',
      table_preferences: {},
      updated_at: new Date().toISOString(),
    },
  ]);

  // System options for both users
  const defaultOptions: SelectOption[] = [];

  const createOption = (
    userId: string,
    key: string,
    label: string,
    color: string,
    sortOrder: number
  ): SelectOption => ({
    id: `opt-${userId}-${key}-${label.replace(/\s+/g, '-').toLowerCase()}`,
    system_column_key: key,
    user_id: userId,
    label,
    color,
    sort_order: sortOrder,
    created_at: new Date().toISOString(),
  });

  for (const uid of [biniId, linhoId]) {
    // Assets
    defaultOptions.push(createOption(uid, 'asset', 'XAUUSD', '#f59e0b', 1));
    defaultOptions.push(createOption(uid, 'asset', 'EURUSD', '#3b82f6', 2));
    defaultOptions.push(createOption(uid, 'asset', 'GBPUSD', '#8b5cf6', 3));
    defaultOptions.push(createOption(uid, 'asset', 'NAS100', '#ec4899', 4));

    // Sessions
    defaultOptions.push(createOption(uid, 'session', 'LONDON', '#3b82f6', 1));
    defaultOptions.push(createOption(uid, 'session', 'NEW YORK', '#8b5cf6', 2));
    defaultOptions.push(createOption(uid, 'session', 'ASIAN', '#ec4899', 3));
    defaultOptions.push(createOption(uid, 'session', 'LON-NEW', '#06b6d4', 4));

    // Durations
    defaultOptions.push(createOption(uid, 'duration', '0-15', '#64748b', 1));
    defaultOptions.push(createOption(uid, 'duration', '15-30', '#64748b', 2));
    defaultOptions.push(createOption(uid, 'duration', '30-60', '#64748b', 3));
    defaultOptions.push(createOption(uid, 'duration', '60-180', '#64748b', 4));
    defaultOptions.push(createOption(uid, 'duration', '180-360', '#64748b', 5));
  }

  await db.select_options.bulkAdd(defaultOptions);

  // Custom column example for BINI_JR
  const setupColId = `col-${biniId}-setup`;
  const customCols: CustomColumn[] = [
    {
      id: setupColId,
      user_id: biniId,
      name: 'Setup',
      type: 'SELECT',
      sort_order: 1,
      is_visible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  await db.custom_columns.bulkAdd(customCols);

  const setupOptions: SelectOption[] = [
    {
      id: `opt-${setupColId}-liq-grab`,
      column_id: setupColId,
      user_id: biniId,
      label: 'Liquidity Grab',
      color: '#10b981',
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: `opt-${setupColId}-fvg`,
      column_id: setupColId,
      user_id: biniId,
      label: 'FVG Retest',
      color: '#3b82f6',
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: `opt-${setupColId}-ob`,
      column_id: setupColId,
      user_id: biniId,
      label: 'Order Block',
      color: '#8b5cf6',
      sort_order: 3,
      created_at: new Date().toISOString(),
    },
  ];
  await db.select_options.bulkAdd(setupOptions);

  // Seed sample realistic historical trades
  const sampleTrades: Trade[] = [
    {
      id: `trade-${biniId}-1`,
      user_id: biniId,
      trade_number: 1,
      date: '2006-03-15',
      asset: 'EURUSD',
      position: 'BUY',
      result: 'TP',
      rr: 2.5,
      session: 'LONDON',
      duration: '30-60',
      notes: 'Premier trade historique backtest 2006.',
      created_at: '2006-03-15T09:30:00Z',
      updated_at: '2006-03-15T09:30:00Z',
      version: 1,
      sync_status: 'synced',
    },
    {
      id: `trade-${biniId}-2`,
      user_id: biniId,
      trade_number: 2,
      date: '2006-03-17',
      asset: 'EURUSD',
      position: 'SELL',
      result: 'SL',
      rr: -1.0,
      session: 'NEW YORK',
      duration: '15-30',
      notes: 'Retournement brutal sur news US.',
      created_at: '2006-03-17T14:45:00Z',
      updated_at: '2006-03-17T14:45:00Z',
      version: 1,
      sync_status: 'synced',
    },
  ];

  await db.trades.bulkAdd(sampleTrades);

  // Link trade 1 with custom value
  const sampleCustomValues: TradeCustomValue[] = [
    {
      id: `val-${sampleTrades[0].id}-${setupColId}`,
      trade_id: sampleTrades[0].id,
      column_id: setupColId,
      value_text: setupOptions[0].id,
      updated_at: new Date().toISOString(),
    },
  ];
  await db.trade_custom_values.bulkAdd(sampleCustomValues);

  // Linho trades
  const linhoTrades: Trade[] = [
    {
      id: `trade-${linhoId}-1`,
      user_id: linhoId,
      trade_number: 1,
      date: '2024-01-10',
      asset: 'XAUUSD',
      position: 'BUY',
      result: 'TP',
      rr: 3.0,
      session: 'NEW YORK',
      duration: '30-60',
      notes: 'Session NY propre, cassure FVG.',
      created_at: '2024-01-10T14:30:00Z',
      updated_at: '2024-01-10T14:30:00Z',
      version: 1,
      sync_status: 'synced',
    },
  ];
  await db.trades.bulkAdd(linhoTrades);

  console.log('[DB] Initialization complete with deterministic initial dataset.');
}
