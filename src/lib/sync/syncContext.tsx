import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SyncService } from './syncService';
import { useLiveQuery } from 'dexie-react-hooks';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error' | 'not_configured';

interface SyncContextType {
  status: SyncState;
  pendingCount: number;
  isOnline: boolean;
  isCloudConnected: boolean;
  lastSyncTime: Date | null;
  lastError: string | null;
  triggerSync: () => Promise<void>;
  pushInitialData: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const realtimeChannelRef = useRef<any>(null);
  const [, setTick] = useState(0);

  const forceRefresh = useCallback(() => setTick(t => t + 1), []);

  // Track online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize: pull data from cloud on startup and set up realtime
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log('[Sync] Supabase not configured, running in local-only mode.');
      return;
    }

    const init = async () => {
      setIsSyncing(true);
      try {
        const result = await SyncService.pullAllData();
        if (result.pulled) {
          setIsCloudConnected(true);
          setLastSyncTime(new Date());
          setLastError(null);
          console.log('[Sync] Initial pull successful.');
        } else {
          setLastError(result.error || 'Erreur de connexion');
          console.warn('[Sync] Initial pull failed:', result.error);
        }
      } catch (err: any) {
        console.error('[Sync] Init error:', err);
        setLastError(err.message);
      } finally {
        setIsSyncing(false);
      }

      // Start realtime subscriptions
      if (!realtimeChannelRef.current) {
        realtimeChannelRef.current = SyncService.subscribeToTrades(forceRefresh);
        if (realtimeChannelRef.current) {
          setIsCloudConnected(true);
          console.log('[Sync] Realtime subscriptions active.');
        }
      }
    };

    init();

    return () => {
      // Cleanup realtime on unmount
      SyncService.unsubscribeAll();
      realtimeChannelRef.current = null;
    };
  }, []);

  // Sync: pull from cloud then push local pending changes
  const triggerSync = async () => {
    if (!isSupabaseConfigured() || !navigator.onLine) return;

    setIsSyncing(true);
    setLastError(null);
    try {
      // Pull first (get latest from associate)
      const pullResult = await SyncService.pullAllData();
      if (!pullResult.pulled) {
        setLastError(pullResult.error || 'Erreur de pull');
        return;
      }

      // Then push any local pending trades
      const pendingTrades = await db.trades
        .filter(t => t.sync_status === 'pending_insert' || t.sync_status === 'pending_update' || t.sync_status === 'pending_delete')
        .toArray();

      for (const trade of pendingTrades) {
        if (trade.sync_status === 'pending_delete') {
          await SyncService.deleteFromCloud('trades', trade.id);
          await db.trades.delete(trade.id);
        } else {
          await SyncService.pushTrade(trade);
        }
      }

      setIsCloudConnected(true);
      setLastSyncTime(new Date());
      console.log(`[Sync] Sync complete. Pushed ${pendingTrades.length} pending trades.`);
    } catch (err: any) {
      console.error('[Sync] triggerSync error:', err);
      setLastError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Push all initial data to the cloud (for first-time setup)
  const pushInitialData = async () => {
    if (!isSupabaseConfigured()) return;
    setIsSyncing(true);
    try {
      await SyncService.pushAllData();
      setIsCloudConnected(true);
      setLastSyncTime(new Date());
      setLastError(null);
    } catch (err: any) {
      setLastError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Periodic sync every 30 seconds
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const interval = setInterval(() => {
      if (navigator.onLine && !isSyncing) {
        triggerSync();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [isSyncing]);

  // Compute status
  let status: SyncState;
  if (!isSupabaseConfigured()) {
    status = 'not_configured';
  } else if (!isOnline) {
    status = 'offline';
  } else if (lastError) {
    status = 'error';
  } else if (isSyncing) {
    status = 'syncing';
  } else {
    status = 'synced';
  }

  return (
    <SyncContext.Provider
      value={{
        status,
        pendingCount: 0,
        isOnline,
        isCloudConnected,
        lastSyncTime,
        lastError,
        triggerSync,
        pushInitialData,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
