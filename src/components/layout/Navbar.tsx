import React, { useState } from 'react';
import {
  BookOpen,
  BarChart3,
  TrendingUp,
  Users,
  HardDrive,
  UserCheck,
  Moon,
  Sun,
  Lock,
  Unlock,
  ChevronDown,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';
import { useSync } from '@/lib/sync/syncContext';

export type NavTab = 'trades' | 'stats' | 'charts' | 'associates' | 'backup' | 'profile';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isDark,
  onToggleTheme,
}) => {
  const {
    currentUser,
    activeAssociate,
    allAssociates,
    isOwner,
    hasUnlockedCrossEdit,
    switchWorkspace,
    lockCrossEdit,
    logout,
  } = useAuth();

  const { status, pendingCount, triggerSync } = useSync();
  const [showAssociateDropdown, setShowAssociateDropdown] = useState(false);

  const navItems = [
    { id: 'trades' as NavTab, label: 'ALL TRADES', icon: BookOpen },
    { id: 'stats' as NavTab, label: 'STATISTIQUES', icon: BarChart3 },
    { id: 'charts' as NavTab, label: 'GRAPHIQUES', icon: TrendingUp },
    { id: 'associates' as NavTab, label: 'ASSOCIÉS', icon: Users },
    { id: 'backup' as NavTab, label: 'SAUVEGARDES', icon: HardDrive },
    { id: 'profile' as NavTab, label: 'PROFIL', icon: UserCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#181818]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Sync Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onTabChange('trades')}>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                JB
              </div>
              <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white hidden md:inline">
                Journal de Backtest
              </span>
            </div>

            {/* Sync Indicator */}
            <div
              onClick={() => triggerSync()}
              title="Cliquez pour forcer la synchronisation"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-[#222222] dark:hover:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700/60"
            >
              {status === 'synced' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700 dark:text-emerald-400">Synchronisé</span>
                </>
              )}
              {status === 'syncing' && (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="text-amber-700 dark:text-amber-400">
                    Synchronisation{pendingCount > 0 ? ` (${pendingCount})` : '...'}
                  </span>
                </>
              )}
              {status === 'offline' && (
                <>
                  <WifiOff className="w-3 h-3 text-red-500" />
                  <span className="text-red-700 dark:text-red-400">Hors connexion</span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#252525]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Associates Switcher & Theme & User */}
          <div className="flex items-center space-x-3">
            {/* Workspace Associate Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowAssociateDropdown(!showAssociateDropdown)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isOwner
                    ? 'bg-gray-50 dark:bg-[#222222] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100'
                    : hasUnlockedCrossEdit
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">{activeAssociate?.username}</span>
                {isOwner ? (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">(Moi)</span>
                ) : hasUnlockedCrossEdit ? (
                  <span title="Édition temporairement déverrouillée">
                    <Unlock className="w-3 h-3 text-amber-500" />
                  </span>
                ) : (
                  <span title="Lecture seule">
                    <Lock className="w-3 h-3 text-blue-500" />
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {/* Dropdown Menu */}
              {showAssociateDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAssociateDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 py-2 z-50 animate-in fade-in duration-100">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Espace de travail actif
                    </div>
                    {allAssociates.map((assoc) => {
                      const isCurrentActive = assoc.id === activeAssociate?.id;
                      const isMe = assoc.id === currentUser?.id;
                      return (
                        <button
                          key={assoc.id}
                          onClick={() => {
                            switchWorkspace(assoc.id);
                            setShowAssociateDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                            isCurrentActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252525]'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                              {assoc.username.slice(0, 2)}
                            </span>
                            <span>{assoc.username}</span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {isMe ? 'Propriétaire' : 'Lecture seule'}
                          </span>
                        </button>
                      );
                    })}

                    {!isOwner && hasUnlockedCrossEdit && (
                      <div className="px-3 pt-2 mt-1 border-t border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => {
                            lockCrossEdit();
                            setShowAssociateDropdown(false);
                          }}
                          className="w-full flex items-center justify-center space-x-1.5 py-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Reverrouiller en lecture seule</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525] transition-colors"
              title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile / Compact Subnav */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-1 border-t border-gray-100 dark:border-gray-800 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white dark:bg-emerald-600 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
