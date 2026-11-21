import React, { useState, useEffect } from 'react';
import { History, Eye, Download, ExternalLink, CheckSquare, Square, RefreshCw, AlertCircle } from 'lucide-react';
import { FileItem, SnapshotVersion } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';

interface SnapshotVersionsTabProps {
  item: FileItem;
  onPreviewSnapshot: (snapshotName: string) => void;
}

export const SnapshotVersionsTab: React.FC<SnapshotVersionsTabProps> = ({ item, onPreviewSnapshot }) => {
  const { selectedDataset } = useDataset();
  const [onlyModified, setOnlyModified] = useState(true);
  const [versions, setVersions] = useState<SnapshotVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = async () => {
    if (!selectedDataset) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<SnapshotVersion[]>('/snapshots/versions', {
        params: {
          datasetId: selectedDataset.id,
          path: item.relativePath,
          onlyModified
        }
      });
      setVersions(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar versões do snapshot');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [item.relativePath, onlyModified, selectedDataset?.id]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownloadSnapshot = (snapName: string) => {
    if (!selectedDataset) return;
    const url = `/api/snapshots/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}&snapshotName=${encodeURIComponent(snapName)}`;
    window.open(url, '_blank');
  };

  const handleOpenDirectorySnapshot = (snapName: string) => {
    if (!selectedDataset) return;
    const url = `/?dataset=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}&snapshot=${encodeURIComponent(snapName)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Filter Checkbox */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={onlyModified}
            onChange={(e) => setOnlyModified(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
          />
          <span>Mostrar apenas versões com modificações</span>
        </label>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 pl-6">
          O TrueNAS cria snapshots periódicos; este filtro oculta datas em que o item permaneceu idêntico.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-400 space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-xs">Consultando snapshots ZFS...</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          Nenhuma versão histórica encontrada nos snapshots.
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.snapshotName}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white font-mono">
                    {version.snapshotName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {version.formattedDate}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  version.changeStatus === 'Modified'
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : version.changeStatus === 'Added'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>
                  {version.changeStatus === 'Modified' ? 'Alterado' : version.changeStatus === 'Added' ? 'Criado' : 'Sem mudanças'}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <span>{item.type === 'File' ? formatBytes(version.size) : `${version.size} itens`}</span>

                <div className="flex items-center space-x-1.5">
                  {item.type === 'File' ? (
                    <>
                      <button
                        onClick={() => onPreviewSnapshot(version.snapshotName)}
                        className="p-1 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Visualizar versão anterior"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadSnapshot(version.snapshotName)}
                        className="p-1 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Baixar versão anterior"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenDirectorySnapshot(version.snapshotName)}
                      className="flex items-center space-x-1 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="Navegar no diretório nesta data em nova aba"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir em nova aba</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
