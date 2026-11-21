import React from 'react';
import { HardDrive, Folder, Image, Video, Music, FileText, Lock, ShieldCheck, Database } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export const SidebarLeft: React.FC = () => {
  const {
    datasets,
    selectedDataset,
    selectDataset,
    currentPath,
    navigateTo,
    snapshotName
  } = useDataset();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 select-none transition-colors">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Datasets Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Datasets
            </span>
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
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Database className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">{dataset.name}</span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    {dataset.hasShadowCopy && (
                      <span title="TrueNAS Shadow Copy / Snapshots Ativos" className="p-1 rounded text-emerald-500">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isRO && (
                      <span title="Somente Leitura (:ro)" className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Navegação
            </span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => navigateTo('')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentPath === ''
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <Folder className="w-4 h-4 text-blue-500" />
              <span>Todos os Arquivos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Disk Usage Widget at Bottom */}
      {selectedDataset && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Armazenamento</span>
            </div>
            <span>{selectedDataset.usedPercentage}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all ${
                selectedDataset.usedPercentage > 90
                  ? 'bg-red-500'
                  : selectedDataset.usedPercentage > 75
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, selectedDataset.usedPercentage)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {formatBytes(selectedDataset.usedBytes)} / {formatBytes(selectedDataset.totalBytes)}
          </p>
        </div>
      )}
    </aside>
  );
};
