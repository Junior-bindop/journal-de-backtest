import React, { useState } from 'react';
import { UserCheck, Lock, Moon, Sun, Save, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';

interface ProfileViewProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ isDark, onToggleTheme }) => {
  const { currentUser, updateProfile } = useAuth();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await updateProfile(
        username !== currentUser?.username ? username : undefined,
        newPassword || undefined
      );

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Erreur de mise à jour' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <UserCheck className="w-6 h-6 text-emerald-500" />
          <span>Profil & Préférences de l'Associé</span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Personnalisez votre identifiant, sécurisez vos accès et ajustez votre thème d'affichage.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
        <form onSubmit={handleUpdate} className="p-6 space-y-6">
          {/* Identity Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Identité de l'associé
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Pseudo visible
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full max-w-md px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-bold"
              />
            </div>
          </div>

          {/* Theme Section */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Thème & Apparence
            </h3>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#202020] text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Mode Clair</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-gray-600" />
                    <span>Mode Sombre (Actif par défaut)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security & Password Section */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Sécurité du mot de passe</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nouveau mot de passe (optionnel)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer"
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
