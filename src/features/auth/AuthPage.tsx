import React, { useState } from 'react';
import { Lock, UserCheck, Sparkles, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './authContext';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
      setIsLoading(true);
      try {
        const res = await register(username, password);
        if (!res.success) {
          setError(res.error || 'Erreur lors de l\'inscription');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error || 'Identifiant ou mot de passe incorrect');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleQuickLogin = (user: string) => {
    setUsername(user);
    setPassword('');
    setMode('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#111111] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-8 text-center border-b border-gray-100 dark:border-gray-800/80 bg-gradient-to-b from-emerald-500/5 to-transparent">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-2xl mb-3 shadow-inner">
            JB
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Journal de Backtest
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Archivage durable, analyses approfondies & gestion multi-associés
          </p>

          <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-500 mt-6 mb-2 tracking-widest uppercase">
            WELCOME TO THE PAIN ZONE
          </h2>

          {/* Quick preset associate badges */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            <span className="text-[11px] text-gray-400">Accès rapide :</span>
            <button
              type="button"
              onClick={() => handleQuickLogin('BINI_JR')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                username === 'BINI_JR'
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : 'bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              BINI_JR
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('LINHO')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                username === 'LINHO'
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : 'bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              LINHO
            </button>
          </div>
        </div>

        {/* Mode Switch Tabs (Section 37) */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#151515]">
          <button
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1a1a1a]'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            SE CONNECTER
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
              mode === 'register'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1a1a1a]'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            S'INSCRIRE EN TANT QU'ASSOCIÉ
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Pseudo de l'associé
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: BINI_JR"
              required
              className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white uppercase font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Confirmation du mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-all"
          >
            <span>
              {isLoading
                ? 'Connexion en cours...'
                : mode === 'login'
                ? 'SE CONNECTER'
                : 'CRÉER MON COMPTE ASSOCIÉ'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
