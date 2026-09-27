import React, { useState } from 'react';
import { Users, Lock, Unlock, ShieldCheck, ArrowRight, UserPlus, CheckCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';
import { ProtectedActionModal } from '@/components/common/ProtectedActionModal';
import { calculateTradeStats, formatR } from '@/utils/statistics';
import type { Trade } from '@/types';

interface AssociatesViewProps {
  allTrades: Trade[];
  onDataRefresh: () => void;
}

export const AssociatesView: React.FC<AssociatesViewProps> = ({
  allTrades,
  onDataRefresh,
}) => {
  const {
    currentUser,
    activeAssociate,
    allAssociates,
    isOwner,
    hasUnlockedCrossEdit,
    switchWorkspace,
    lockCrossEdit,
  } = useAuth();

  const [isProtectedModalOpen, setIsProtectedModalOpen] = useState(false);
  const [targetAssociateToUnlock, setTargetAssociateToUnlock] = useState<string | null>(null);

  // Compute stats for each associate
  const associateStats = allAssociates.map((assoc) => {
    const assocTrades = allTrades.filter(t => t.user_id === assoc.id && !t.deleted_at);
    const stats = calculateTradeStats(assocTrades);
    return {
      associate: assoc,
      stats,
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-emerald-500" />
            <span>Gestion des Associés & Espaces Indépendants</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Chaque associé dispose d'un espace de trades, captures et statistiques étanche. La consultation mutuelle est autorisée en lecture seule.
          </p>
        </div>
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
                          Vous
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
                      <span>Espace Actif</span>
                    </span>
                  )}

                  {!isMe && (
                    <span className="flex items-center space-x-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {hasUnlockedCrossEdit && isActiveWorkspace ? (
                        <span className="flex items-center space-x-1 text-amber-500 font-semibold">
                          <Unlock className="w-3 h-3" />
                          <span>Déverrouillé</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Lecture Seule</span>
                        </span>
                      )}
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
                {!isActiveWorkspace ? (
                  <button
                    onClick={() => switchWorkspace(associate.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-emerald-600 hover:opacity-90 rounded-lg transition-opacity"
                  >
                    <span>Consulter cet espace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Vous consultez cet espace</span>
                )}

                {!isMe && isActiveWorkspace && (
                  <div>
                    {hasUnlockedCrossEdit ? (
                      <button
                        onClick={lockCrossEdit}
                        className="flex items-center space-x-1 text-xs text-amber-500 hover:underline"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Verrouiller</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setTargetAssociateToUnlock(associate.username);
                          setIsProtectedModalOpen(true);
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Déverrouiller modifications</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Associate Security Info Box (Section 38 & 39) */}
      <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
        <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">
          Règle de Sécurité des Permissions
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          Lorsqu'un associé consulte l'espace d'un confrère, toutes les opérations de modification, d'ajout ou de suppression sont verrouillées en lecture seule. Pour modifier temporairement les données d'un autre associé, le mot de passe de celui-ci est exigé et vérifié cryptographiquement par le serveur.
        </p>
      </div>

      {/* Protected Modal */}
      {isProtectedModalOpen && (
        <ProtectedActionModal
          isOpen={isProtectedModalOpen}
          onClose={() => setIsProtectedModalOpen(false)}
          onSuccess={() => {
            setIsProtectedModalOpen(false);
            onDataRefresh();
          }}
          actionDescription={`modifier l'espace de ${targetAssociateToUnlock || activeAssociate?.username}`}
        />
      )}
    </div>
  );
};
