import React, { useState, useEffect } from 'react';
import { X, FileText, Folder, Camera, MapPin, Aperture, Clock, Eye, Info, HardDrive, ShieldCheck } from 'lucide-react';
import { FileItem, MediaMetadata } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';
import { SnapshotVersionsTab } from '../snapshots/SnapshotVersionsTab';

interface PropertiesSidebarProps {
  item?: FileItem | null;
  onPreviewSnapshot: (snapshotName: string) => void;
  onOpenFile?: (item: FileItem) => void;
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({ item, onPreviewSnapshot, onOpenFile }) => {
  const { selectedDataset, currentPath, snapshotName, setSelectedItem, listing } = useDataset();
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'details' | 'snapshots'>('details');
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  useEffect(() => {
    if (item && item.category === 'Image') {
      apiClient.get<MediaMetadata>('/metadata', {
        params: {
          datasetId: selectedDataset?.id,
          path: item.relativePath,
          snapshotName
        }
      })
      .then(res => setMetadata(res.data))
      .catch(() => setMetadata(null));
    } else {
      setMetadata(null);
    }
  }, [item?.relativePath, selectedDataset?.id, snapshotName]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(locale);
    } catch {
      return dateStr;
    }
  };

  const getRawUrl = (file: FileItem) => {
    if (!selectedDataset) return '';
    const token = localStorage.getItem('csb_token') || '';
    let url = `/api/files/raw?datasetId=${selectedDataset.id}&path=${encodeURIComponent(file.relativePath)}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    if (snapshotName) url += `&snapshotName=${encodeURIComponent(snapshotName)}`;
    return url;
  };

  const getImagePreviewUrl = (file: FileItem) => {
    if (!selectedDataset) return '';
    const token = localStorage.getItem('csb_token') || '';
    if (file.extension.toLowerCase() === '.svg') {
      return getRawUrl(file);
    }
    let url = `/api/thumbnails/${selectedDataset.id}?path=${encodeURIComponent(file.relativePath)}&width=400&height=300`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    if (snapshotName) url += `&snapshotName=${encodeURIComponent(snapshotName)}`;
    return url;
  };

  const directoryItem: FileItem = {
    name: currentPath ? (currentPath.split('/').filter(Boolean).pop() || currentPath) : (selectedDataset?.name || 'Raiz'),
    relativePath: currentPath,
    type: 'Directory',
    size: 0,
    createdAtUtc: new Date().toISOString(),
    lastModifiedAtUtc: new Date().toISOString(),
    isReadOnly: selectedDataset?.accessMode === 'ReadOnly',
    hasShadowCopy: selectedDataset?.hasShadowCopy || false,
    hasThumbnail: false,
    category: 'Document',
    extension: ''
  };

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] flex flex-col h-[calc(100vh-4rem)] sticky top-16 shrink-0 transition-colors z-10 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 truncate mr-2">
          {item ? (
            item.type === 'Directory' ? (
              <Folder className="w-5 h-5 text-blue-500 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
            )
          ) : (
            <Folder className="w-5 h-5 text-blue-500 shrink-0" />
          )}
          <span className="font-semibold text-sm text-slate-800 dark:text-zinc-100 truncate" title={item ? item.name : directoryItem.name}>
            {item ? item.name : directoryItem.name}
          </span>
        </div>
        {item ? (
          <button
            onClick={() => setSelectedItem(null)}
            title="Limpar seleção"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
            Geral
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 px-4">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {t('properties.tabDetails')}
        </button>
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'snapshots'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {t('properties.tabSnapshots')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        {activeTab === 'details' ? (
          item ? (
            <>
              {/* Image Preview Box */}
              {item.category === 'Image' && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 p-2.5 text-center">
                  <img
                    src={getImagePreviewUrl(item)}
                    alt={item.name}
                    className="max-h-44 w-full object-contain rounded-xl mx-auto"
                    onError={(e) => {
                      const rawFallback = getRawUrl(item);
                      if (!e.currentTarget.src.includes('/api/files/raw') && rawFallback) {
                        e.currentTarget.src = rawFallback;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                  {onOpenFile && (
                    <button
                      onClick={() => onOpenFile(item)}
                      className="mt-2.5 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Abrir Visualizador</span>
                    </button>
                  )}
                </div>
              )}

              {/* Media Info Cards */}
              {metadata && (metadata.cameraModel || metadata.fNumber || metadata.isoSpeed) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    Informações de Mídia
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {metadata.fNumber && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">
                          <Aperture className="w-3 h-3" />
                          <span>Abertura</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{metadata.fNumber}</p>
                      </div>
                    )}

                    {metadata.exposureTime && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>Exposição</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{metadata.exposureTime}s</p>
                      </div>
                    )}

                    {metadata.isoSpeed && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">ISO</div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{metadata.isoSpeed}</p>
                      </div>
                    )}

                    {metadata.width && metadata.height && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">Dimensões</div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{metadata.width} × {metadata.height}</p>
                      </div>
                    )}
                  </div>

                  {metadata.cameraModel && (
                    <div className="mt-2 bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">
                        <Camera className="w-3 h-3" />
                        <span>Câmera</span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">
                        {metadata.cameraMake} {metadata.cameraModel}
                      </p>
                    </div>
                  )}

                  {metadata.latitude && metadata.longitude && (
                    <div className="mt-2 bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span>Localização GPS</span>
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                        {metadata.latitude.toFixed(5)}, {metadata.longitude.toFixed(5)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                  {t('properties.tabDetails')}
                </h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500">{t('properties.name')}:</span>
                    <p className="font-medium text-slate-800 dark:text-zinc-100 break-words mt-0.5">{item.name}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 dark:text-zinc-500">{t('properties.path')}:</span>
                    <p className="font-mono text-[11px] text-slate-600 dark:text-zinc-400 break-words mt-0.5">
                      /{item.relativePath}
                    </p>
                  </div>

                  {item.type === 'File' && (
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500">{t('properties.size')}:</span>
                      <p className="font-medium text-slate-800 dark:text-zinc-100 mt-0.5">{formatBytes(item.size)}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 dark:text-zinc-500">{t('properties.modified')}:</span>
                    <p className="font-medium text-slate-800 dark:text-zinc-100 mt-0.5">{formatDate(item.lastModifiedAtUtc)}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 dark:text-zinc-500">{t('properties.permission')}:</span>
                    <div className="mt-1">
                      {item.isReadOnly ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {t('common.readOnly')} (:ro)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {t('common.readWrite')} (:rw)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty State: Directory / Dataset Overview */
            <div className="space-y-6">
              {selectedDataset ? (
                <>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <HardDrive className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {selectedDataset.name}
                        </span>
                      </div>
                      {selectedDataset.hasShadowCopy && (
                        <span title="TrueNAS Shadow Copy / ZFS Snapshots" className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>ZFS</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] space-y-1 text-slate-500 dark:text-zinc-400">
                      <div className="flex justify-between">
                        <span>Permissão:</span>
                        <span className="font-semibold text-slate-700 dark:text-zinc-200">
                          {selectedDataset.accessMode === 'ReadOnly' ? 'Somente Leitura (:ro)' : 'Leitura e Escrita (:rw)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Caminho Atual:</span>
                        <span className="font-mono text-slate-700 dark:text-zinc-300 truncate max-w-[150px]">
                          /{currentPath || 'Raiz'}
                        </span>
                      </div>
                    </div>

                    {/* Storage Bar */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-zinc-200 mb-1">
                        <span>Uso do Disco</span>
                        <span>{selectedDataset.usedPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, selectedDataset.usedPercentage)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                        {formatBytes(selectedDataset.usedBytes)} de {formatBytes(selectedDataset.totalBytes)}
                      </p>
                    </div>
                  </div>

                  {listing && (
                    <div className="space-y-2 text-xs">
                      <h4 className="font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider text-[11px]">
                        Neste Diretório
                      </h4>
                      <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-1.5 text-slate-600 dark:text-zinc-300">
                        <div className="flex justify-between">
                          <span>Total de itens:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{listing.totalItems}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pastas:</span>
                          <span className="font-semibold">{listing.items.filter(i => i.type === 'Directory').length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Arquivos:</span>
                          <span className="font-semibold">{listing.items.filter(i => i.type === 'File').length}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50/60 dark:bg-zinc-900/60 rounded-xl border border-blue-100 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 flex space-x-2.5">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>Selecione um arquivo ou pasta na lista para ver detalhes individuais, metadados EXIF e ações rápidas.</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400 dark:text-zinc-500 text-xs space-y-2">
                  <HardDrive className="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-700 stroke-1" />
                  <p className="font-semibold text-slate-600 dark:text-zinc-300">Nenhum dataset selecionado</p>
                  <p className="text-[11px]">Selecione um dataset à esquerda para visualizar suas propriedades e arquivos.</p>
                </div>
              )}
            </div>
          )
        ) : (
          item ? (
            <SnapshotVersionsTab item={item} onPreviewSnapshot={onPreviewSnapshot} />
          ) : selectedDataset ? (
            <SnapshotVersionsTab item={directoryItem} onPreviewSnapshot={onPreviewSnapshot} />
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-zinc-500 text-xs">
              Selecione um dataset para visualizar o histórico de snapshots ZFS.
            </div>
          )
        )}
      </div>
    </aside>
  );
};
