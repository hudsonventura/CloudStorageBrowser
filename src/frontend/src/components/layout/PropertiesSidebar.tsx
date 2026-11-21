import React, { useState, useEffect } from 'react';
import { X, FileText, Folder, Calendar, HardDrive, Shield, Camera, MapPin, Aperture, Clock, Cpu } from 'lucide-react';
import { FileItem, MediaMetadata } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';
import { SnapshotVersionsTab } from '../snapshots/SnapshotVersionsTab';

interface PropertiesSidebarProps {
  item: FileItem;
  onClose: () => void;
  onPreviewSnapshot: (snapshotName: string) => void;
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({ item, onClose, onPreviewSnapshot }) => {
  const { selectedDataset, snapshotName } = useDataset();
  const [activeTab, setActiveTab] = useState<'details' | 'snapshots'>('details');
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  useEffect(() => {
    if (item.category === 'Image') {
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
  }, [item.relativePath, selectedDataset?.id, snapshotName]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[calc(100vh-4rem)] sticky top-16 shrink-0 transition-colors z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 truncate mr-2">
          {item.type === 'Directory' ? (
            <Folder className="w-5 h-5 text-blue-500 shrink-0" />
          ) : (
            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
          )}
          <span className="font-semibold text-sm text-slate-800 dark:text-white truncate" title={item.name}>
            {item.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-4">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          Detalhes
        </button>
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'snapshots'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          Versões Anteriores (ZFS)
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        {activeTab === 'details' ? (
          <>
            {/* Media Info Cards (Cloudreve-style EXIF cards) */}
            {metadata && (metadata.cameraModel || metadata.fNumber || metadata.isoSpeed) && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Informações de Mídia
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {metadata.fNumber && (
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-semibold">
                        <Aperture className="w-3 h-3" />
                        <span>Abertura</span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.fNumber}</p>
                    </div>
                  )}

                  {metadata.exposureTime && (
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-semibold">
                        <Clock className="w-3 h-3" />
                        <span>Exposição</span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.exposureTime}s</p>
                    </div>
                  )}

                  {metadata.isoSpeed && (
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">ISO</div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.isoSpeed}</p>
                    </div>
                  )}

                  {metadata.width && metadata.height && (
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Dimensões</div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metadata.width} × {metadata.height}</p>
                    </div>
                  )}
                </div>

                {metadata.cameraModel && (
                  <div className="mt-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-semibold">
                      <Camera className="w-3 h-3" />
                      <span>Câmera</span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {metadata.cameraMake} {metadata.cameraModel}
                    </p>
                  </div>
                )}

                {metadata.latitude && metadata.longitude && (
                  <div className="mt-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-semibold">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>Localização GPS</span>
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {metadata.latitude.toFixed(5)}, {metadata.longitude.toFixed(5)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Basic Info */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Informações Básicas
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400">Nome:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 break-words mt-0.5">{item.name}</p>
                </div>

                <div>
                  <span className="text-slate-400">Caminho:</span>
                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-words mt-0.5">
                    /{item.relativePath}
                  </p>
                </div>

                {item.type === 'File' && (
                  <div>
                    <span className="text-slate-400">Tamanho:</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{formatBytes(item.size)}</p>
                  </div>
                )}

                <div>
                  <span className="text-slate-400">Última Modificação:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(item.lastModifiedAtUtc)}</p>
                </div>

                <div>
                  <span className="text-slate-400">Modo de Acesso:</span>
                  <div className="mt-1">
                    {item.isReadOnly ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                        Somente Leitura (:ro)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                        Leitura e Escrita (:rw)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <SnapshotVersionsTab item={item} onPreviewSnapshot={onPreviewSnapshot} />
        )}
      </div>
    </aside>
  );
};
