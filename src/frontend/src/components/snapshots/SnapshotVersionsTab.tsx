import React, { useState, useEffect } from 'react';
import { Eye, Download, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { FileItem, SnapshotVersion } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';

interface SnapshotVersionsTabProps {
  item: FileItem;
  onPreviewSnapshot: (snapshotName: string) => void;
}

export const SnapshotVersionsTab: React.FC<SnapshotVersionsTabProps> = ({ item, onPreviewSnapshot }) => {
  const { selectedDataset } = useDataset();
  const { t, locale } = useI18n();
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(locale);
    } catch {
      return dateStr;
    }
  };

  const handleDownloadSnapshot = (snapName: string) => {
    if (!selectedDataset) return;
    const token = localStorage.getItem('csb_token') || '';
    let url = `/api/snapshots/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}&snapshotName=${encodeURIComponent(snapName)}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  const handleOpenDirectorySnapshot = (snapName: string) => {
    if (!selectedDataset) return;
    const pathPart = item.relativePath ? `/${item.relativePath.split('/').map(encodeURIComponent).join('/')}` : '';
    const url = `/${encodeURIComponent(selectedDataset.name)}${pathPart}?snapshot=${encodeURIComponent(snapName)}`;
    window.open(url, '_blank');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Modified': return t('snapshots.statusModified');
      case 'Added': return t('snapshots.statusAdded');
      default: return t('snapshots.statusUnchanged');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Checkbox */}
      <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
        <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={onlyModified}
            onChange={(e) => setOnlyModified(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          />
          <span>{t('snapshots.filterModified')}</span>
        </label>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 pl-6">
          {t('snapshots.filterHint')}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-400 dark:text-zinc-500 space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-xs">{t('snapshots.querying')}</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center space-x-2 border border-red-200 dark:border-red-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-zinc-500 text-xs">
          {t('snapshots.noVersions')}
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.snapshotName}
              className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-100 truncate max-w-[180px]" title={version.snapshotName}>
                  @{version.snapshotName}
                </span>
                {version.changeStatus !== 'Unchanged' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {getStatusLabel(version.changeStatus)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-2">
                <span>{version.formattedDate || formatDate(version.timestamp)}</span>
                {version.type !== 'Directory' && <span>{formatBytes(version.size)}</span>}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800">
                {version.type === 'Directory' ? (
                  <button
                    onClick={() => handleOpenDirectorySnapshot(version.snapshotName)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-blue-50 dark:bg-zinc-800 hover:bg-blue-100 dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('snapshots.openInNewTab')}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onPreviewSnapshot(version.snapshotName)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t('snapshots.preview')}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSnapshot(version.snapshotName)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center justify-center space-x-1 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('snapshots.download')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
