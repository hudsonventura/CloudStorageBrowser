import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { apiClient } from '../api/client';
import { LoginResponse } from '../types';
import appLogo from '../assets/logo.png';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const { t, locale, setLocale, languages } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', {
        username: username.trim(),
        password
      });
      login(res.data);
      navigate('/home');
    } catch (err: any) {
      setError(err?.response?.data?.message || t('login.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-100 via-slate-50 to-blue-50 dark:from-black dark:via-[#09090b] dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur relative">
        {/* Language selector top-right */}
        <div className="absolute top-6 right-6 flex items-center space-x-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLocale(lang.code)}
              className={`p-1.5 rounded-lg text-sm transition-all ${
                locale === lang.code
                  ? 'bg-white dark:bg-zinc-700 shadow-xs scale-105'
                  : 'opacity-60 hover:opacity-100'
              }`}
              title={lang.label}
            >
              <span>{lang.flag}</span>
            </button>
          ))}
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 hover:scale-105 transition-transform drop-shadow-md">
            <img src={appLogo} alt="CloudStorageBrowser Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('login.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            {t('login.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-2xl flex items-center space-x-2 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              {t('login.username')}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('login.username')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              {t('login.password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? t('login.signingIn') : t('login.signIn')}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
