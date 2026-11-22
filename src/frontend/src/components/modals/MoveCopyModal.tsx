import React, { useState, useEffect } from 'react';
import { X, Folder, FolderInput, Copy, Move, Database, ChevronRight, HardDrive, CornerLeftUp, Check } from 'lucide-react';
import { FileItem, Dataset } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';

interface MoveCopyModalProps {
  item: FileItem;
  mode: 'move' | 'copy';
  onClose: () => void;
  onSuccess: () => void;
}

export const MoveCopyModal: React.FC<MoveCopyModalProps> = ({
  item,
  mode,
  onClose,
  onSuccess
}) => {
  const { datasets, selectedDataset } = useDataset();
  const { t } = useI18n();

  // Writable datasets available as targets
  const writableDatasets = datasets.filter(d => d.accessMode !== 'ReadOnly');

  // Default to current dataset if writable, or first writable dataset
  const defaultDatasetId = (selectedDataset && selectedDataset.accessMode !== 'ReadOnly')
    ? selectedDataset.id
    : (writableDatasets[0]?.id || selectedDataset?.id || 0);

  const [targetDatasetId, setTargetDatasetId] = useState<number>(defaultDatasetId);
  const [targetDirectory, setTargetDirectory] = useState<string>('');
  const [subfolders, setSubfolders] = useState<FileItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load subfolders when target dataset or targetDirectory changes
  useEffect(() => {
    if (!targetDatasetId) return;

    let isMounted = true;
    setIsLoadingFolders(true);

    apiClient
      .get('/files/browse', {
        params: {
          datasetId: targetDatasetId,
          path: targetDirectory,
          pageSize: 200,
          showHidden: false
        }
      })
      .then(res => {
        if (!isMounted) return;
        const allItems: FileItem[] = res.data?.items || [];
        // Filter only directories, and exclude the item itself if moving a folder into itself
        const dirs = allItems.filter(i => {
          if (i.type !== 'Directory') return false;
          if (targetDatasetId === selectedDataset?.id && item.type === 'Directory') {
            if (i.relativePath === item.relativePath) return false;
          }
          return true;
        });
        setSubfolders(dirs);
      })
      .catch(() => {
        if (isMounted) setSubfolders([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFolders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetDatasetId, targetDirectory, selectedDataset?.id, item.type, item.relativePath]);

  const handleNavigateUp = () => {
    if (!targetDirectory) return;
    const parts = targetDirectory.split('/').filter(Boolean);
    parts.pop();
    setTargetDirectory(parts.join('/'));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedDataset || !targetDatasetId) return;

    setIsSubmitting(true);
    setError(null);

    const endpoint = mode === 'move' ? '/files/move' : '/files/copy';

    try {
      await apiClient.post(endpoint, {
        datasetId: selectedDataset.id,
        targetDatasetId: targetDatasetId,
        sourcePath: item.relativePath,
        targetDirectory: targetDirectory.trim()
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || (mode === 'move' ? 'Falha ao mover item' : 'Falha ao copiar item'));
      setIsSubmitting(false);
    }
  };

  const targetDataset = datasets.find(d => d.id === targetDatasetId);
  const title = mode === 'move'
    ? t('modals.moveTitle', { name: item.name })
    : t('modals.copyTitle', { name: item.name });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5 truncate mr-4">
            <div className={`p-2 rounded-xl ${
              mode === 'move'
                ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            }`}>
              {mode === 'move' ? <Move className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate" title={title}>
                {title}
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 font-mono truncate">
                {selectedDataset?.name}: /{item.relativePath}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="overflow-y-auto space-y-5 my-4 pr-1">
          {/* Datasets Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              {t('modals.destinationDataset')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {datasets.map(ds => {
                const isSelected = ds.id === targetDatasetId;
                const isReadOnly = ds.accessMode === 'ReadOnly';

                return (
                  <button
                    key={ds.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      if (!isReadOnly) {
                        setTargetDatasetId(ds.id);
                        setTargetDirectory('');
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30'
                        : isReadOnly
                        ? 'border-slate-200 dark:border-zinc-800 opacity-40 cursor-not-allowed bg-slate-50 dark:bg-zinc-900/50'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Database className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-slate-400 dark:text-zinc-500'}`} />
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {ds.name}
                        </span>
                      </div>
                      {isReadOnly ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                          RO
                        </span>
                      ) : isSelected ? (
                        <Check className="w-3.5 h-3.5 text-blue-500" />
                      ) : null}
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-zinc-500">
                      <span>{formatBytes(ds.totalBytes - ds.usedBytes)} livres</span>
                      <span className="font-mono">{ds.usedPercentage}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Folder Navigation */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              {t('modals.destinationFolder')}
            </label>

            {/* Current Target Breadcrumbs Bar */}
            <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs mb-3">
              <div className="flex items-center space-x-1.5 truncate">
                <button
                  type="button"
                  onClick={() => setTargetDirectory('')}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5 rounded"
                >
                  {targetDataset?.name} (/)
                </button>
                {targetDirectory && targetDirectory.split('/').filter(Boolean).map((seg, idx, arr) => {
                  const segPath = arr.slice(0, idx + 1).join('/');
                  return (
                    <React.Fragment key={segPath}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setTargetDirectory(segPath)}
                        className={`px-1 py-0.5 rounded truncate max-w-[120px] ${
                          idx === arr.length - 1
                            ? 'font-bold text-slate-800 dark:text-zinc-200'
                            : 'text-blue-600 dark:text-blue-400 hover:underline'
                        }`}
                      >
                        {seg}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {targetDirectory && (
                <button
                  type="button"
                  onClick={handleNavigateUp}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors shrink-0 ml-2"
                  title="Subir um nível"
                >
                  <CornerLeftUp className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Folder browser list */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-zinc-950/40 min-h-[140px] max-h-[180px] overflow-y-auto">
              {isLoadingFolders ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                  Carregando pastas...
                </div>
              ) : subfolders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                  Nenhuma subpasta aqui. O item será gravado diretamente nesta pasta.
                </div>
              ) : (
                <div className="space-y-1">
                  {subfolders.map(folder => (
                    <button
                      key={folder.relativePath}
                      type="button"
                      onClick={() => setTargetDirectory(folder.relativePath)}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 flex items-center justify-between text-xs transition-colors group"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-zinc-300 truncate">
                          {folder.name}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !targetDatasetId || targetDataset?.accessMode === 'ReadOnly'}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center space-x-1.5 ${
              mode === 'move' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <span>{mode === 'move' ? t('modals.moving') : t('modals.copying')}</span>
            ) : (
              <span>{mode === 'move' ? t('modals.moveHere') : t('modals.copyHere')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
