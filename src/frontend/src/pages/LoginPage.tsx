import React, { useState } from 'react';
import { Cloud, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { LoginResponse } from '../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Usuário ou senha inválidos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-100 via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30 mb-4">
            <Cloud className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            CloudStorageBrowser
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Navegador de Diretórios e Visualizador de Arquivos
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
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Usuário
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuário"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Entrando...' : 'Entrar no Sistema'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Usuário inicial padrão: <strong className="text-slate-600 dark:text-slate-300">admin</strong> / Senha:{' '}
            <strong className="text-slate-600 dark:text-slate-300">admin</strong>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Sessão protegida por JWT válida por 30 dias</p>
        </div>
      </div>
    </div>
  );
};
