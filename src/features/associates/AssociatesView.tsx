import React, { useState } from 'react';
import { Users, Lock, Unlock, Eye, ArrowRight, CheckCircle, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';
import { calculateTradeStats, formatR } from '@/utils/statistics';
import type { Trade } from '@/types';

interface AssociatesViewProps {
  allTrades: Trade[];
  onDataRefresh: () => void;
  onNavigateToTab?: (tab: 'trades' | 'stats' | 'charts') => void;
}

export const AssociatesView: React.FC<AssociatesViewProps> = ({
  allTrades,
  onDataRefresh,
  onNavigateToTab,
}) => {
  const {
    currentUser,
    activeAssociate,
    allAssociates,
    switchWorkspace,
    logout,
  } = useAuth();

  const [promptSwitchUser, setPromptSwitchUser] = useState<string | null>(null);

  // Compute stats for each associate
  const associateStats = allAssociates.map((assoc) => {
    const assocTrades = allTrades.filter(t => t.user_id === assoc.id && !t.deleted_at);
    const stats = calculateTradeStats(assocTrades);
    return {
      associate: assoc,
      stats,
    };
  });

  const handleConsultWorkspace = (associateId: string) => {
    switchWorkspace(associateId);
    if (onNavigateToTab) {
      onNavigateToTab('trades');
    }
  };

  const handleConfirmLoginAsAssociate = (targetUsername: string) => {
    // Log out and prepare login screen
    logout();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <Users className="w-6 h-6 text-emerald-500" />
          <span>Gestion des Associés & Consultation Immédiate</span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Basculez en 1 clic pour consulter les trades, graphiques et statistiques de votre associé en lecture seule.
        </p>
      </div>

      {/* Associates Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {associateStats.map(({ associate, stats }) => {
          const isMe = associate.id === currentUser?.id;
          const isActiveWorkspace = associate.id === activeAssociate?.id;

          return (
            <div
              key={associate.id}
              className={`p-6 rounded-2xl border transition-all ${
                isActiveWorkspace
                  ? 'bg-white dark:bg-[#1a1a1a] border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800'
              }`}
            >
              {/* Card Top */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base border border-emerald-500/20">
                    {associate.username.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {associate.username}
                      </h3>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Votre compte connecté
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">Rôle : Associé</span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col items-end space-y-1">
                  {isActiveWorkspace && (
                    <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Espace Actuellement Consulté</span>
                    </span>
                  )}

                  {!isMe && (
                    <span className="flex items-center space-x-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <Lock className="w-3 h-3 text-blue-500" />
                      <span>Lecture Seule</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Performance Summary of this Associate */}
              <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-gray-800 text-center mb-5">
                <div>
                  <div className="text-[10px] text-gray-400">Trades</div>
                  <div className="text-sm font-bold font-mono text-gray-900 dark:text-white mt-0.5">
                    {stats.totalTrades}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Winrate</div>
                  <div className="text-sm font-bold font-mono text-blue-500 mt-0.5">
                    {stats.winrate}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Total R</div>
                  <div className={`text-sm font-bold font-mono mt-0.5 ${stats.totalR >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatR(stats.totalR)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Profit F.</div>
                  <div className="text-sm font-bold font-mono text-amber-500 mt-0.5">
                    {stats.profitFactor}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => handleConsultWorkspace(associate.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActiveWorkspace
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-[#252525] text-gray-800 dark:text-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {isActiveWorkspace ? 'Voir les trades de cet espace' : 'Consulter cet espace'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {!isMe && (
                  <button
                    onClick={() => setPromptSwitchUser(associate.username)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Se connecter en tant que {associate.username}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Redirection / Switch Modal when attempting to modify another associate's space */}
      {promptSwitchUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5 text-amber-600 dark:text-amber-400 font-bold text-base">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Changer d'associé</span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Ces données appartiennent à <strong>{promptSwitchUser}</strong>.
              Vous êtes actuellement connecté en tant que <strong>{currentUser?.username}</strong>.
              <br /><br />
              Voulez-vous vous connecter en tant que <strong>{promptSwitchUser}</strong> pour modifier cet espace ?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setPromptSwitchUser(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleConfirmLoginAsAssociate(promptSwitchUser)}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter en tant que {promptSwitchUser}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
