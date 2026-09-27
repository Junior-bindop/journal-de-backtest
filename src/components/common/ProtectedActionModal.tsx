import React, { useState } from 'react';
import { Lock, AlertCircle, X, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';

interface ProtectedActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionDescription?: string;
}

export const ProtectedActionModal: React.FC<ProtectedActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionDescription = 'modifier ces données',
}) => {
  const { activeAssociate, verifyAndUnlockCrossEdit } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await verifyAndUnlockCrossEdit(password);
      if (res.success) {
        setPassword('');
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Mot de passe incorrect');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de vérification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-amber-500/10">
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-semibold text-lg">
            <Lock className="w-5 h-5" />
            <span>MODIFICATION PROTÉGÉE</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Ces données appartiennent à{' '}
            <strong className="text-gray-900 dark:text-white font-bold">{activeAssociate?.username}</strong>.
            Pour {actionDescription}, vous devez saisir le mot de passe de cet associé.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Mot de passe de {activeAssociate?.username} :
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              required
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-gray-900 dark:text-white"
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              ANNULER
            </button>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Vérification...' : 'AUTHENTIFIER'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
