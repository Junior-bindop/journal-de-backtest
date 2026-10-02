import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { db } from '@/lib/db';
import type {
  User,
  UserSettings,
  Trade,
  CustomColumn,
  SelectOption,
  TradeCustomValue,
  TradeImage,
} from '@/types';

/**
 * SyncService — Handles bidirectional sync between local Dexie DB and Supabase Cloud.
 *
 * Strategy: Offline-first.
 *   - All writes go to Dexie first (instant UI).
 *   - Changes are then pushed to Supabase in the background.
 *   - On startup (and periodically), we pull the latest data from Supabase
 *     and merge it into the local DB.
 *   - Supabase Realtime subscriptions push live updates from other users.
 */
export class SyncService {

  // ─── PUSH: Local → Cloud ────────────────────────────────────────────

  /** Push a single user record to Supabase */
  static async pushUser(user: User): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      username: user.username,
      password_hash: user.password_hash,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }, { onConflict: 'id' });
    if (error) console.error('[Sync] pushUser error:', error.message);
  }

  /** Push user settings */
  static async pushUserSettings(settings: UserSettings): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('user_settings').upsert({
      id: settings.id,
      user_id: settings.user_id,
      theme: settings.theme,
      table_preferences: settings.table_preferences || {},
      updated_at: settings.updated_at,
    }, { onConflict: 'id' });
    if (error) console.error('[Sync] pushUserSettings error:', error.message);
  }

  /** Push a single trade to Supabase */
  static async pushTrade(trade: Trade): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('trades').upsert({
      id: trade.id,
      user_id: trade.user_id,
      trade_number: trade.trade_number,
      date: trade.date,
      asset: trade.asset,
      position: trade.position,
      result: trade.result,
      rr: trade.rr,
      session: trade.session,
      duration: trade.duration,
      notes: trade.notes || null,
      created_at: trade.created_at,
      updated_at: trade.updated_at,
      deleted_at: trade.deleted_at || null,
      version: trade.version,
      sync_status: 'synced',
    }, { onConflict: 'id' });
    if (error) console.error('[Sync] pushTrade error:', error.message);
    else {
      // Mark local record as synced
      await db.trades.update(trade.id, { sync_status: 'synced' });
    }
  }

  /** Push a custom column */
  static async pushCustomColumn(col: CustomColumn): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('custom_columns').upsert({
      id: col.id,
      user_id: col.user_id,
      name: col.name,
      type: col.type,
      sort_order: col.sort_order,
      is_visible: col.is_visible,
      created_at: col.created_at,
      updated_at: col.updated_at,
    }, { onConflict: 'id' });
    if (error) console.error('[Sync] pushCustomColumn error:', error.message);
  }

  /** Push a select option */
  static async pushSelectOption(opt: SelectOption): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('select_options').upsert({
      id: opt.id,
      column_id: opt.column_id || null,
      system_column_key: opt.system_column_key || null,
      user_id: opt.user_id,
      label: opt.label,
      color: opt.color,
      sort_order: opt.sort_order,
      created_at: opt.created_at,
    }, { onConflict: 'id' });
    if (error) console.error('[Sync] pushSelectOption error:', error.message);
  }

  /** Push a trade custom value */
  static async pushTradeCustomValue(val: TradeCustomValue): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('trade_custom_values').upsert({
      id: val.id,
      trade_id: val.trade_id,
      column_id: val.column_id,
      value_text: val.value_text || null,
      value_number: val.value_number ?? null,
      value_date: val.value_date || null,
      value_boolean: val.value_boolean ?? null,
      value_json: val.value_json || null,
      updated_at: val.updated_at,
    }, { onConflict: 'id' });
    if (error) console.error('[Sync] pushTradeCustomValue error:', error.message);
  }

  /** Push a trade image metadata (not the blob itself) */
  static async pushTradeImage(img: TradeImage): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('trade_images').upsert({
      id: img.id,
      trade_id: img.trade_id,
      user_id: img.user_id,
      file_name: img.file_name,
      storage_path: img.storage_path,
      mime_type: img.mime_type,
      file_size: img.file_size,
      comment: img.comment || null,
      sort_order: img.sort_order,
      created_at: img.created_at,
      updated_at: img.updated_at,
      deleted_at: img.deleted_at || null,
    }, { onConflict: 'id' });
    if (error) console.error('[Sync] pushTradeImage error:', error.message);
  }

  /** Delete a record from a cloud table */
  static async deleteFromCloud(table: string, id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.error(`[Sync] delete from ${table} error:`, error.message);
  }

  // ─── PUSH ALL: Full sync from local → cloud ──────────────────────

  /** Push ALL local data to Supabase (initial upload or full re-sync) */
  static async pushAllData(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    console.log('[Sync] Starting full push to cloud...');

    const users = await db.users.toArray();
    for (const u of users) await this.pushUser(u);

    const settings = await db.user_settings.toArray();
    for (const s of settings) await this.pushUserSettings(s);

    const trades = await db.trades.toArray();
    for (const t of trades) await this.pushTrade(t);

    const cols = await db.custom_columns.toArray();
    for (const c of cols) await this.pushCustomColumn(c);

    const opts = await db.select_options.toArray();
    for (const o of opts) await this.pushSelectOption(o);

    const vals = await db.trade_custom_values.toArray();
    for (const v of vals) await this.pushTradeCustomValue(v);

    const imgs = await db.trade_images.toArray();
    for (const img of imgs) await this.pushTradeImage(img);

    console.log('[Sync] Full push complete.');
  }

  // ─── PULL: Cloud → Local ────────────────────────────────────────────

  /** Pull ALL data from Supabase into local Dexie (merge strategy: cloud wins on newer updated_at) */
  static async pullAllData(): Promise<{ pulled: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { pulled: false, error: 'Supabase non configuré' };

    try {
      console.log('[Sync] Pulling data from cloud...');

      // Pull users
      const { data: cloudUsers, error: usersErr } = await supabase.from('users').select('*');
      if (usersErr) throw usersErr;
      if (cloudUsers && cloudUsers.length > 0) {
        for (const cu of cloudUsers) {
          const local = await db.users.get(cu.id);
          if (!local || cu.updated_at > local.updated_at) {
            await db.users.put({
              id: cu.id,
              username: cu.username,
              password_hash: cu.password_hash,
              role: cu.role,
              created_at: cu.created_at,
              updated_at: cu.updated_at,
            });
          }
        }
      }

      // Pull user_settings
      const { data: cloudSettings, error: settErr } = await supabase.from('user_settings').select('*');
      if (settErr) throw settErr;
      if (cloudSettings) {
        for (const cs of cloudSettings) {
          const local = await db.user_settings.get(cs.id);
          if (!local || cs.updated_at > local.updated_at) {
            await db.user_settings.put({
              id: cs.id,
              user_id: cs.user_id,
              theme: cs.theme,
              table_preferences: cs.table_preferences || {},
              updated_at: cs.updated_at,
            });
          }
        }
      }

      // Pull trades
      const { data: cloudTrades, error: tradesErr } = await supabase.from('trades').select('*');
      if (tradesErr) throw tradesErr;
      if (cloudTrades) {
        const cloudIds = new Set(cloudTrades.map(t => t.id));
        const localTrades = await db.trades.toArray();
        for (const local of localTrades) {
          if (!cloudIds.has(local.id)) await db.trades.delete(local.id);
        }
        for (const ct of cloudTrades) {
          const local = await db.trades.get(ct.id);
          if (!local || ct.updated_at > local.updated_at) {
            await db.trades.put({
              id: ct.id,
              user_id: ct.user_id,
              trade_number: ct.trade_number,
              date: ct.date,
              asset: ct.asset,
              position: ct.position,
              result: ct.result,
              rr: Number(ct.rr),
              session: ct.session,
              duration: ct.duration,
              notes: ct.notes || '',
              created_at: ct.created_at,
              updated_at: ct.updated_at,
              deleted_at: ct.deleted_at || null,
              version: ct.version || 1,
              sync_status: 'synced',
            });
          }
        }
      }

      // Pull custom_columns
      const { data: cloudCols, error: colsErr } = await supabase.from('custom_columns').select('*');
      if (colsErr) throw colsErr;
      if (cloudCols) {
        const cloudIds = new Set(cloudCols.map(c => c.id));
        const localCols = await db.custom_columns.toArray();
        for (const local of localCols) {
          if (!cloudIds.has(local.id)) await db.custom_columns.delete(local.id);
        }
        for (const cc of cloudCols) {
          const local = await db.custom_columns.get(cc.id);
          if (!local || cc.updated_at > local.updated_at) {
            await db.custom_columns.put({
              id: cc.id,
              user_id: cc.user_id,
              name: cc.name,
              type: cc.type,
              sort_order: cc.sort_order,
              is_visible: cc.is_visible,
              created_at: cc.created_at,
              updated_at: cc.updated_at,
            });
          }
        }
      }

      // Pull select_options
      const { data: cloudOpts, error: optsErr } = await supabase.from('select_options').select('*');
      if (optsErr) throw optsErr;
      if (cloudOpts) {
        const cloudIds = new Set(cloudOpts.map(o => o.id));
        const localOpts = await db.select_options.toArray();
        for (const local of localOpts) {
          if (!cloudIds.has(local.id)) await db.select_options.delete(local.id);
        }
        for (const co of cloudOpts) {
          const local = await db.select_options.get(co.id);
          if (!local) {
            await db.select_options.put({
              id: co.id,
              column_id: co.column_id || undefined,
              system_column_key: co.system_column_key || undefined,
              user_id: co.user_id,
              label: co.label,
              color: co.color,
              sort_order: co.sort_order,
              created_at: co.created_at,
            });
          }
        }
      }

      // Pull trade_custom_values
      const { data: cloudVals, error: valsErr } = await supabase.from('trade_custom_values').select('*');
      if (valsErr) throw valsErr;
      if (cloudVals) {
        for (const cv of cloudVals) {
          const local = await db.trade_custom_values.get(cv.id);
          if (!local || cv.updated_at > local.updated_at) {
            await db.trade_custom_values.put({
              id: cv.id,
              trade_id: cv.trade_id,
              column_id: cv.column_id,
              value_text: cv.value_text || undefined,
              value_number: cv.value_number != null ? Number(cv.value_number) : undefined,
              value_date: cv.value_date || undefined,
              value_boolean: cv.value_boolean ?? undefined,
              value_json: cv.value_json || undefined,
              updated_at: cv.updated_at,
            });
          }
        }
      }

      // Pull trade_images
      const { data: cloudImgs, error: imgsErr } = await supabase.from('trade_images').select('*');
      if (imgsErr) throw imgsErr;
      if (cloudImgs) {
        for (const ci of cloudImgs) {
          const local = await db.trade_images.get(ci.id);
          if (!local || ci.updated_at > local.updated_at) {
            await db.trade_images.put({
              id: ci.id,
              trade_id: ci.trade_id,
              user_id: ci.user_id,
              file_name: ci.file_name,
              storage_path: ci.storage_path,
              mime_type: ci.mime_type,
              file_size: ci.file_size,
              comment: ci.comment || '',
              sort_order: ci.sort_order,
              created_at: ci.created_at,
              updated_at: ci.updated_at,
              deleted_at: ci.deleted_at || undefined,
            });
          }
        }
      }

      console.log('[Sync] Pull complete.');
      return { pulled: true };
    } catch (err: any) {
      console.error('[Sync] Pull error:', err.message || err);
      return { pulled: false, error: err.message || 'Erreur de synchronisation' };
    }
  }

  // ─── REALTIME SUBSCRIPTIONS ─────────────────────────────────────────

  /** Subscribe to real-time changes on the trades table */
  static subscribeToTrades(onUpdate: () => void) {
    if (!isSupabaseConfigured()) return null;

    const channel = supabase
      .channel('trades-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, async (payload) => {
        console.log('[Realtime] trades change:', payload.eventType);
        const record = payload.new as any;
        if (record && record.id) {
          const local = await db.trades.get(record.id);
          if (!local || record.updated_at > local.updated_at) {
            await db.trades.put({
              id: record.id,
              user_id: record.user_id,
              trade_number: record.trade_number,
              date: record.date,
              asset: record.asset,
              position: record.position,
              result: record.result,
              rr: Number(record.rr),
              session: record.session,
              duration: record.duration,
              notes: record.notes || '',
              created_at: record.created_at,
              updated_at: record.updated_at,
              deleted_at: record.deleted_at || null,
              version: record.version || 1,
              sync_status: 'synced',
            });
            onUpdate();
          }
        }
        if (payload.eventType === 'DELETE' && payload.old) {
          const oldRecord = payload.old as any;
          if (oldRecord.id) {
            await db.trades.delete(oldRecord.id);
            onUpdate();
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_columns' }, async (payload) => {
        console.log('[Realtime] custom_columns change:', payload.eventType);
        if (payload.eventType === 'DELETE' && payload.old) {
          await db.custom_columns.delete((payload.old as any).id);
        } else if (payload.new) {
          const r = payload.new as any;
          await db.custom_columns.put({
            id: r.id, user_id: r.user_id, name: r.name, type: r.type,
            sort_order: r.sort_order, is_visible: r.is_visible,
            created_at: r.created_at, updated_at: r.updated_at,
          });
        }
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'select_options' }, async (payload) => {
        console.log('[Realtime] select_options change:', payload.eventType);
        if (payload.eventType === 'DELETE' && payload.old) {
          await db.select_options.delete((payload.old as any).id);
        } else if (payload.new) {
          const r = payload.new as any;
          await db.select_options.put({
            id: r.id, column_id: r.column_id || undefined,
            system_column_key: r.system_column_key || undefined,
            user_id: r.user_id, label: r.label, color: r.color,
            sort_order: r.sort_order, created_at: r.created_at,
          });
        }
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_custom_values' }, async (payload) => {
        console.log('[Realtime] trade_custom_values change:', payload.eventType);
        if (payload.eventType === 'DELETE' && payload.old) {
          await db.trade_custom_values.delete((payload.old as any).id);
        } else if (payload.new) {
          const r = payload.new as any;
          await db.trade_custom_values.put({
            id: r.id, trade_id: r.trade_id, column_id: r.column_id,
            value_text: r.value_text || undefined, value_number: r.value_number != null ? Number(r.value_number) : undefined,
            value_date: r.value_date || undefined, value_boolean: r.value_boolean ?? undefined,
            value_json: r.value_json || undefined, updated_at: r.updated_at,
          });
        }
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_images' }, async (payload) => {
        console.log('[Realtime] trade_images change:', payload.eventType);
        if (payload.eventType === 'DELETE' && payload.old) {
          await db.trade_images.delete((payload.old as any).id);
        } else if (payload.new) {
          const r = payload.new as any;
          await db.trade_images.put({
            id: r.id, trade_id: r.trade_id, user_id: r.user_id,
            file_name: r.file_name, storage_path: r.storage_path,
            mime_type: r.mime_type, file_size: r.file_size,
            comment: r.comment || '', sort_order: r.sort_order,
            created_at: r.created_at, updated_at: r.updated_at,
            deleted_at: r.deleted_at || undefined,
          });
        }
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async (payload) => {
        console.log('[Realtime] users change:', payload.eventType);
        if (payload.new) {
          const r = payload.new as any;
          await db.users.put({
            id: r.id, username: r.username, password_hash: r.password_hash,
            role: r.role, created_at: r.created_at, updated_at: r.updated_at,
          });
        }
        onUpdate();
      })
      .subscribe();

    return channel;
  }

  /** Unsubscribe from all channels */
  static async unsubscribeAll() {
    await supabase.removeAllChannels();
  }
}
