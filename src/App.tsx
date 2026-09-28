import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { initializeDatabase } from '@/lib/db/seed';
import { useAuth } from '@/features/auth/authContext';
import { AuthPage } from '@/features/auth/AuthPage';
import { Navbar, type NavTab } from '@/components/layout/Navbar';
import { TradesTable } from '@/features/trades/TradesTable';
import { StatisticsView } from '@/features/statistics/StatisticsView';
import { ChartsView } from '@/features/charts/ChartsView';
import { AssociatesView } from '@/features/associates/AssociatesView';
import { BackupView } from '@/features/backup/BackupView';
import { ProfileView } from '@/features/profile/ProfileView';

export const App: React.FC = () => {
  const { currentUser, activeAssociate } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('trades');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  // Initialize DB with seed data on mount
  useEffect(() => {
    initializeDatabase().catch(console.error);
  }, []);

  // Reactive queries based on current active workspace associate
  const currentAssociateId = activeAssociate?.id;

  const trades = useLiveQuery(
    () => currentAssociateId
      ? db.trades.where('user_id').equals(currentAssociateId).toArray()
      : [],
    [currentAssociateId]
  ) || [];

  const allTrades = useLiveQuery(() => db.trades.toArray(), []) || [];

  const customColumns = useLiveQuery(
    () => currentAssociateId
      ? db.custom_columns.where('user_id').equals(currentAssociateId).sortBy('sort_order')
      : [],
    [currentAssociateId]
  ) || [];

  const selectOptions = useLiveQuery(
    () => currentAssociateId
      ? db.select_options.where('user_id').equals(currentAssociateId).toArray()
      : [],
    [currentAssociateId]
  ) || [];

  const customValues = useLiveQuery(() => db.trade_custom_values.toArray(), []) || [];

  const images = useLiveQuery(
    () => currentAssociateId
      ? db.trade_images.where('user_id').equals(currentAssociateId).toArray()
      : [],
    [currentAssociateId]
  ) || [];

  // Force re-render callback for manual refreshes
  const [, setTick] = useState(0);
  const handleDataRefresh = () => setTick(t => t + 1);

  // If not logged in, show Auth Page
  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col text-gray-900 dark:text-gray-100">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 flex flex-col">
        {activeTab === 'trades' && (
          <TradesTable
            trades={trades}
            customColumns={customColumns}
            selectOptions={selectOptions}
            customValues={customValues}
            images={images}
            onDataRefresh={handleDataRefresh}
          />
        )}

        {activeTab === 'stats' && (
          <StatisticsView trades={trades} />
        )}

        {activeTab === 'charts' && (
          <ChartsView trades={trades} />
        )}

        {activeTab === 'associates' && (
          <AssociatesView
            allTrades={allTrades}
            onDataRefresh={handleDataRefresh}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'backup' && (
          <BackupView onDataRefresh={handleDataRefresh} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
        )}
      </main>
    </div>
  );
};
