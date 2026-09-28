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
      id: generateUUID(),
      user_id: biniId,
      theme: 'dark',
      table_preferences: {},
      updated_at: new Date().toISOString(),
    },
    {
      id: generateUUID(),
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
    id: generateUUID(),
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
  const setupColId = generateUUID();
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
      id: generateUUID(),
      column_id: setupColId,
      user_id: biniId,
      label: 'Liquidity Grab',
      color: '#10b981',
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: generateUUID(),
      column_id: setupColId,
      user_id: biniId,
      label: 'FVG Retest',
      color: '#3b82f6',
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: generateUUID(),
      column_id: setupColId,
      user_id: biniId,
      label: 'Order Block',
      color: '#8b5cf6',
      sort_order: 3,
      created_at: new Date().toISOString(),
    },
  ];
  await db.select_options.bulkAdd(setupOptions);

  // Seed sample realistic historical trades spanning 2006 to 2026
  const sampleTrades: Trade[] = [
    {
      id: generateUUID(),
      user_id: biniId,
      trade_number: 1,
      date: '2006-03-15',
      asset: 'EURUSD',
      position: 'BUY',
      result: 'TP',
      rr: 2.5,
      session: 'LONDON',
      duration: '30-60',
      notes: 'Premier trade historique backtest 2006. Cassure franche du plus haut asiatique.',
      created_at: '2006-03-15T09:30:00Z',
      updated_at: '2006-03-15T09:30:00Z',
      version: 1,
      sync_status: 'synced',
    },
    {
      id: generateUUID(),
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
    {
      id: generateUUID(),
      user_id: biniId,
      trade_number: 3,
      date: '2008-09-15',
      asset: 'XAUUSD',
      position: 'BUY',
      result: 'TP',
      rr: 3.8,
      session: 'LON-NEW',
      duration: '180-360',
      notes: 'Crise des subprimes, envolée or.',
      created_at: '2008-09-15T11:00:00Z',
      updated_at: '2008-09-15T11:00:00Z',
      version: 1,
      sync_status: 'synced',
    },
    {
      id: generateUUID(),
      user_id: biniId,
      trade_number: 4,
      date: '2015-01-15',
      asset: 'EURUSD',
      position: 'BUY',
      result: 'BE',
      rr: 0.0,
      session: 'LONDON',
      duration: '60-180',
      notes: 'Sortie sécurisée à BE avant volatilité BNS.',
      created_at: '2015-01-15T08:15:00Z',
      updated_at: '2015-01-15T08:15:00Z',
      version: 1,
      sync_status: 'synced',
    },
    {
      id: generateUUID(),
      user_id: biniId,
      trade_number: 5,
      date: '2020-03-23',
      asset: 'XAUUSD',
      position: 'BUY',
      result: 'TP',
      rr: 4.25,
      session: 'NEW YORK',
      duration: '60-180',
      notes: 'Rebond macroéconomique majeur.',
      created_at: '2020-03-23T15:00:00Z',
      updated_at: '2020-03-23T15:00:00Z',
      version: 1,
      sync_status: 'synced',
    },
    {
      id: generateUUID(),
      user_id: biniId,
      trade_number: 6,
      date: '2024-05-10',
      asset: 'XAUUSD',
      position: 'SELL',
      result: 'TP',
      rr: 2.0,
      session: 'LONDON',
      duration: '30-60',
      notes: 'Prise de liquidité sommet européen puis continuation baissière.',
      created_at: '2024-05-10T09:15:00Z',
      updated_at: '2024-05-10T09:15:00Z',
      version: 1,
      sync_status: 'synced',
    },
    {
      id: generateUUID(),
      user_id: biniId,
      trade_number: 7,
      date: '2026-09-26',
      asset: 'EURUSD',
      position: 'BUY',
      result: 'TP',
      rr: 2.75,
      session: 'LONDON',
      duration: '15-30',
      notes: 'Setup idéal 2026. Belle impulsion.',
      created_at: '2026-09-26T08:45:00Z',
      updated_at: '2026-09-26T08:45:00Z',
      version: 1,
      sync_status: 'synced',
    },
  ];

  await db.trades.bulkAdd(sampleTrades);

  // Link trade 1 with custom value
  const sampleCustomValues: TradeCustomValue[] = [
    {
      id: generateUUID(),
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
      id: generateUUID(),
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
    {
      id: generateUUID(),
      user_id: linhoId,
      trade_number: 2,
      date: '2024-01-12',
      asset: 'EURUSD',
      position: 'SELL',
      result: 'SL',
      rr: -1.0,
      session: 'LONDON',
      duration: '15-30',
      notes: 'Fakeout.',
      created_at: '2024-01-12T09:10:00Z',
      updated_at: '2024-01-12T09:10:00Z',
      version: 1,
      sync_status: 'synced',
    },
  ];
  await db.trades.bulkAdd(linhoTrades);

  console.log('[DB] Initialization complete with initial users, options, and trades.');
}
