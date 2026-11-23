import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Moon, Sun, LogOut, FolderPlus, Upload, FileText, KeyRound, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import appLogo from '../../assets/logo.png';

interface HeaderProps {
  onNewFolder: () => void;
  onUploadClick: () => void;
  onNewTextFile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewFolder, onUploadClick, onNewTextFile }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { searchQuery, setSearchQuery, selectedDataset, snapshotName, showHidden, setShowHidden } = useDataset();
  const { t, locale, setLocale, languages, currentLanguage } = useI18n();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
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
    <header className="h-16 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] px-6 flex items-center justify-between shrink-0 z-20 transition-colors">
      {/* Brand */}
      <div
        onClick={() => navigate('/home')}
        className="flex items-center space-x-3 cursor-pointer select-none group"
      >
        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform drop-shadow-sm">
          <img src={appLogo} alt="Logo" className="w-9 h-9 object-contain" />
        </div>
        <div>
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            CloudStorageBrowser
          </span>
        </div>
      </div>

      {/* Center: + New button & Search */}
      <div className="flex items-center space-x-4 flex-1 max-w-xl mx-8">
        {/* + New dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            disabled={isReadOnly}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-sm ${
              isReadOnly
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{t('header.new')}</span>
          </button>

          {isNewMenuOpen && !isReadOnly && (
            <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-30 animate-in fade-in zoom-in-95">
              <button
                onClick={() => { setIsNewMenuOpen(false); onNewFolder(); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center space-x-3 transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-blue-500" />
                <span>{t('header.newFolder')}</span>
              </button>
              <button
                onClick={() => { setIsNewMenuOpen(false); onUploadClick(); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center space-x-3 transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>{t('header.uploadFiles')}</span>
              </button>
              <button
                onClick={() => { setIsNewMenuOpen(false); onNewTextFile(); }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center space-x-3 transition-colors"
              >
                <FileText className="w-4 h-4 text-amber-500" />
                <span>{t('header.newTextFile')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-3" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('header.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-black text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 transition-all outline-none"
          />
        </div>
      </div>

      {/* Right: Theme Toggle & User Profile */}
      <div className="flex items-center space-x-3">
        {/* Dark/Light toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? t('header.lightTheme') : t('header.darkTheme')}
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm relative">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
              <span className="absolute -bottom-1 -right-1 text-xs select-none" title={currentLanguage.label}>
                {currentLanguage.flag}
              </span>
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-200 hidden md:block">
              {user?.username || 'admin'}
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-30 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-zinc-800">
                <p className="text-xs text-slate-400 dark:text-zinc-500">{t('header.signedInAs')}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">{user?.username}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded-md">
                  {user?.role || 'Admin'}
                </span>
              </div>

              {/* Preferences: Hidden Files Checkbox & Language Flags */}
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800 space-y-2.5">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(e) => setShowHidden(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                  <span>{t('header.showHidden')}</span>
                </label>

                {/* Language flags selector */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center space-x-1">
                      <Globe className="w-3 h-3" />
                      <span>{t('header.language')}</span>
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                      {currentLanguage.flag} {currentLanguage.code}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLocale(lang.code)}
                        className={`flex items-center justify-center space-x-1.5 py-1.5 px-1 rounded-xl text-xs font-medium border transition-all ${
                          locale === lang.code
                            ? 'bg-blue-50 dark:bg-zinc-800 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                            : 'border-slate-200 dark:border-zinc-750 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                        }`}
                        title={lang.label}
                      >
                        <span className="text-sm">{lang.flag}</span>
                        <span className="text-[10px] font-mono">{lang.code.split('-')[0].toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 transition-colors"
              >
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>{t('header.changePassword')}</span>
              </button>

              <button
                onClick={logout}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center space-x-2.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('header.signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isChangePasswordOpen && (
        <ChangePasswordModal onClose={() => setIsChangePasswordOpen(false)} />
      )}
    </header>
  );
};
