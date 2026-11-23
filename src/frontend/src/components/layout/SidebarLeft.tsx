import React from 'react';
import { HardDrive, Folder, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';

export const SidebarLeft: React.FC = () => {
  const {
    datasets,
    selectedDataset,
    selectDataset,
    currentPath,
    navigateTo,
    refreshDatasets
  } = useDataset();
  const { t } = useI18n();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] flex flex-col h-full shrink-0 select-none transition-colors overflow-hidden">
      <div className="p-4 space-y-6 overflow-y-auto flex-1 min-h-0">
        {/* Datasets Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              {t('sidebar.datasets')}
            </span>
            <button
              onClick={() => refreshDatasets()}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title={t('sidebar.refreshDatasets')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {datasets.map((dataset) => {
              const isSelected = selectedDataset?.id === dataset.id;
              const isRO = dataset.accessMode === 'ReadOnly';

              return (
                <button
                  key={dataset.id}
                  onClick={() => selectDataset(dataset)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/50 dark:border-zinc-700/80 shadow-xs'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Database className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                    <span className="truncate">{dataset.name}</span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    {dataset.hasShadowCopy && (
                      <span title={t('sidebar.zfsActive')} className="p-1 rounded text-emerald-500">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isRO && (
                      <span title={t('sidebar.roBadge')} className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800">
                        RO
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Directory Navigation */}
        <div>
          <div className="px-2 mb-2">
            <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              {t('sidebar.navigation')}
            </span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => navigateTo('')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentPath === ''
                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-semibold'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-850'
              }`}
            >
              <Folder className="w-4 h-4 text-blue-500" />
              <span>{t('browser.folders')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Disk Usage Widget at Bottom */}
      {selectedDataset && (
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/95 transition-colors shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-2">
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Armazenamento</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">{selectedDataset.usedPercentage}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mb-2 border border-slate-300/40 dark:border-zinc-700/60">
            <div
              className={`h-full rounded-full transition-all ${
                selectedDataset.usedPercentage > 90
                  ? 'bg-red-500'
                  : selectedDataset.usedPercentage > 75
                  ? 'bg-amber-500'
                  : 'bg-blue-600 dark:bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, selectedDataset.usedPercentage)}%` }}
            />
          </div>

          <p className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
            {formatBytes(selectedDataset.usedBytes)} / {formatBytes(selectedDataset.totalBytes)}
          </p>
        </div>
      )}
    </aside>
  );
};
