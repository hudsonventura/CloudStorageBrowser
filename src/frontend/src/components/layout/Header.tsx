import React, { useState, useRef, useEffect } from 'react';
import { Cloud, Plus, Search, Moon, Sun, Settings, LogOut, FolderPlus, Upload, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDataset } from '../../context/DatasetContext';

interface HeaderProps {
  onNewFolder: () => void;
  onUploadClick: () => void;
  onNewTextFile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewFolder, onUploadClick, onNewTextFile }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { searchQuery, setSearchQuery, selectedDataset, snapshotName } = useDataset();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isReadOnly = selectedDataset?.accessMode === 'ReadOnly' || !!snapshotName;

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Cloud className="w-6 h-6" />
        </div>
        <div>
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">CloudStorageBrowser</span>
        </div>
      </div>

      {/* Center: + Novo button & Search */}
      <div className="flex items-center space-x-4 flex-1 max-w-xl mx-8">
        {/* + Novo dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            disabled={isReadOnly}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-sm ${
              isReadOnly
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Novo</span>
          </button>

          {isNewMenuOpen && !isReadOnly && (
            <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-30 animate-in fade-in zoom-in-95">
              <button
                onClick={() => { setIsNewMenuOpen(false); onNewFolder(); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-3"
              >
                <FolderPlus className="w-4 h-4 text-blue-500" />
                <span>Nova Pasta</span>
              </button>
              <button
                onClick={() => { setIsNewMenuOpen(false); onUploadClick(); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-3"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Enviar Arquivos</span>
              </button>
              <button
                onClick={() => { setIsNewMenuOpen(false); onNewTextFile(); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-3"
              >
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Novo Arquivo de Texto</span>
              </button>
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Pressione / para buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all outline-none"
          />
        </div>
      </div>

      {/* Right: Theme Toggle & User Profile */}
      <div className="flex items-center space-x-3">
        {/* Dark/Light toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden md:block">
              {user?.username || 'admin'}
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-30">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400">Conectado como</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user?.username}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md">
                  {user?.role || 'Admin'}
                </span>
              </div>
              <button
                onClick={logout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center space-x-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
