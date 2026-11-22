import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Folder,
  Camera,
  MapPin,
  Aperture,
  Clock,
  Eye,
  Info,
  HardDrive,
  ShieldCheck,
  Film,
  Music,
  Play,
  Layers,
  Palette,
  Radio,
  Activity,
  Maximize2,
  Volume2
} from 'lucide-react';
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
    if (item && (item.category === 'Image' || item.category === 'Video' || item.category === 'Audio')) {
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
  }, [item?.relativePath, item?.category, selectedDataset?.id, snapshotName]);

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

  const formatBitrate = (bps?: number) => {
    if (!bps || bps <= 0) return null;
    if (bps >= 1_000_000) {
      return (bps / 1_000_000).toFixed(1) + ' Mbps';
    }
    return Math.round(bps / 1_000) + ' kbps';
  };

  const formatDuration = (dur?: string) => {
    if (!dur) return null;
    const parts = dur.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = Math.floor(parseFloat(parts[2]));
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return dur;
  };

  const formatSampleRate = (sr?: number) => {
    if (!sr || sr <= 0) return null;
    return `${(sr / 1000).toFixed(1)} kHz`;
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
              {/* Media Preview Box (Image, Video, Audio) */}
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
                      <span>{t('properties.openFile')}</span>
                    </button>
                  )}
                </div>
              )}

              {item.category === 'Video' && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 p-3 text-center">
                  <div className="w-full h-28 rounded-xl bg-gradient-to-br from-slate-900 via-zinc-900 to-indigo-950 flex flex-col items-center justify-center text-slate-300 relative border border-slate-800/80 shadow-inner">
                    <Film className="w-9 h-9 text-indigo-400 mb-1" />
                    <span className="text-[11px] font-mono font-semibold text-slate-300">
                      {metadata?.duration ? formatDuration(metadata.duration) : item.name}
                    </span>
                  </div>
                  {onOpenFile && (
                    <button
                      onClick={() => onOpenFile(item)}
                      className="mt-2.5 w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{t('properties.openFile')}</span>
                    </button>
                  )}
                </div>
              )}

              {item.category === 'Audio' && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 p-3 text-center">
                  <div className="w-full h-28 rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center text-slate-300 relative border border-purple-900/40 shadow-inner">
                    <Music className="w-9 h-9 text-purple-400 mb-1" />
                    <span className="text-[11px] font-mono font-semibold text-purple-200">
                      {metadata?.duration ? formatDuration(metadata.duration) : item.name}
                    </span>
                  </div>
                  {onOpenFile && (
                    <button
                      onClick={() => onOpenFile(item)}
                      className="mt-2.5 w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{t('properties.openFile')}</span>
                    </button>
                  )}
                </div>
              )}

              {/* IMAGE METADATA */}
              {item.category === 'Image' && metadata && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    {t('properties.imageInfo')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {metadata.width && metadata.height && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Maximize2 className="w-3 h-3 shrink-0" />
                          <span>{t('properties.dimensions')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {metadata.width} × {metadata.height}
                        </p>
                        {metadata.aspectRatio && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                            {metadata.aspectRatio}
                          </span>
                        )}
                      </div>
                    )}

                    {metadata.format && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Layers className="w-3 h-3 shrink-0" />
                          <span>{t('properties.format')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {metadata.format}
                        </p>
                      </div>
                    )}

                    {metadata.colorCount && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Palette className="w-3 h-3 shrink-0 text-amber-500" />
                          <span>{t('properties.colorCount')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {metadata.colorCount >= 1000000
                            ? `${(metadata.colorCount / 1000000).toFixed(1)}M`
                            : metadata.colorCount.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {(metadata.colorType || metadata.bitsPerPixel) && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Palette className="w-3 h-3 shrink-0" />
                          <span>{t('properties.colorType')}</span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-zinc-100 mt-0.5 text-[11px] truncate" title={metadata.colorType || ''}>
                          {metadata.colorType || `${metadata.bitsPerPixel}-bit`}
                        </p>
                      </div>
                    )}

                    {metadata.fNumber && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Aperture className="w-3 h-3" />
                          <span>{t('properties.aperture')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{metadata.fNumber}</p>
                      </div>
                    )}

                    {metadata.exposureTime && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Clock className="w-3 h-3" />
                          <span>{t('properties.exposure')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{metadata.exposureTime}s</p>
                      </div>
                    )}

                    {metadata.isoSpeed && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">{t('properties.iso')}</div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{metadata.isoSpeed}</p>
                      </div>
                    )}
                  </div>

                  {metadata.cameraModel && (
                    <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">
                        <Camera className="w-3 h-3" />
                        <span>{t('properties.camera')}</span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">
                        {metadata.cameraMake} {metadata.cameraModel}
                      </p>
                      {metadata.lens && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{metadata.lens}</p>
                      )}
                    </div>
                  )}

                  {metadata.latitude && metadata.longitude && (
                    <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span>{t('properties.gps')}</span>
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                        {metadata.latitude.toFixed(5)}, {metadata.longitude.toFixed(5)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AUDIO METADATA */}
              {item.category === 'Audio' && metadata && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    {t('properties.audioInfo')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(metadata.audioCodec || metadata.format) && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Music className="w-3 h-3 shrink-0 text-purple-500" />
                          <span>{t('properties.audioCodec')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 text-[11px] truncate" title={metadata.audioCodec || ''}>
                          {metadata.audioCodec || metadata.format}
                        </p>
                      </div>
                    )}

                    {(metadata.audioBitrate || metadata.overallBitrate) && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Activity className="w-3 h-3 shrink-0" />
                          <span>{t('properties.bitrate')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {formatBitrate(metadata.audioBitrate || metadata.overallBitrate)}
                        </p>
                      </div>
                    )}

                    {metadata.audioBitrateMode && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Radio className="w-3 h-3 shrink-0" />
                          <span>{t('properties.bitrateMode')}</span>
                        </div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            metadata.audioBitrateMode === 'VBR'
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}>
                            {metadata.audioBitrateMode === 'VBR' ? t('properties.vbr') : t('properties.cbr')}
                          </span>
                        </div>
                      </div>
                    )}

                    {metadata.audioSampleRate && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Activity className="w-3 h-3 shrink-0" />
                          <span>{t('properties.sampleRate')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {formatSampleRate(metadata.audioSampleRate)}
                        </p>
                      </div>
                    )}

                    {metadata.audioChannels && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 col-span-2">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Volume2 className="w-3 h-3 shrink-0" />
                          <span>{t('properties.channels')}</span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {metadata.audioChannels === 1
                            ? t('properties.audioChannelsMono')
                            : metadata.audioChannels === 2
                              ? t('properties.audioChannelsStereo')
                              : t('properties.audioChannelsSurround', { count: metadata.audioChannels })}
                          {metadata.audioChannelLayout ? ` (${metadata.audioChannelLayout})` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIDEO METADATA */}
              {item.category === 'Video' && metadata && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    {t('properties.videoInfo')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {metadata.width && metadata.height && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Maximize2 className="w-3 h-3 shrink-0" />
                          <span>{t('properties.dimensions')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {metadata.width} × {metadata.height}
                        </p>
                        {metadata.aspectRatio && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                            {metadata.aspectRatio}
                          </span>
                        )}
                      </div>
                    )}

                    {metadata.videoCodec && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Film className="w-3 h-3 shrink-0 text-indigo-500" />
                          <span>{t('properties.videoCodec')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 text-[11px] truncate" title={metadata.videoCodec}>
                          {metadata.videoCodec}
                        </p>
                        {metadata.videoProfile && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate block">
                            {metadata.videoProfile}
                          </span>
                        )}
                      </div>
                    )}

                    {(metadata.videoBitrate || metadata.overallBitrate) && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Activity className="w-3 h-3 shrink-0" />
                          <span>{t('properties.bitrate')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {formatBitrate(metadata.videoBitrate || metadata.overallBitrate)}
                        </p>
                      </div>
                    )}

                    {metadata.frameRate && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{t('properties.frameRate')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 truncate">
                          {metadata.frameRate} fps
                        </p>
                      </div>
                    )}

                    {metadata.pixelFormat && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Palette className="w-3 h-3 shrink-0" />
                          <span>{t('properties.pixelFormat')}</span>
                        </div>
                        <p className="font-mono text-slate-700 dark:text-zinc-300 mt-0.5 text-[11px] truncate">
                          {metadata.pixelFormat}
                        </p>
                      </div>
                    )}

                    {metadata.duration && (
                      <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold truncate">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{t('properties.duration')}</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5 font-mono truncate">
                          {formatDuration(metadata.duration)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Video Integrated Audio Track */}
                  {metadata.audioCodec && (
                    <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800 text-xs space-y-2">
                      <div className="flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-semibold">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{t('properties.audioTrack')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 dark:text-zinc-500">{t('properties.audioCodec')}:</span>
                          <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{metadata.audioCodec}</p>
                        </div>
                        {metadata.audioBitrate && (
                          <div>
                            <span className="text-slate-400 dark:text-zinc-500">{t('properties.bitrate')}:</span>
                            <p className="font-semibold text-slate-800 dark:text-zinc-200">{formatBitrate(metadata.audioBitrate)}</p>
                          </div>
                        )}
                        {metadata.audioSampleRate && (
                          <div>
                            <span className="text-slate-400 dark:text-zinc-500">{t('properties.sampleRate')}:</span>
                            <p className="font-semibold text-slate-800 dark:text-zinc-200">{formatSampleRate(metadata.audioSampleRate)}</p>
                          </div>
                        )}
                        {metadata.audioChannels && (
                          <div>
                            <span className="text-slate-400 dark:text-zinc-500">{t('properties.channels')}:</span>
                            <p className="font-semibold text-slate-800 dark:text-zinc-200">
                              {metadata.audioChannels === 1 ? 'Mono' : metadata.audioChannels === 2 ? 'Estéreo' : `${metadata.audioChannels} canais`}
                            </p>
                          </div>
                        )}
                      </div>
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

                  {item.type === 'File' ? (
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500">{t('properties.size')}:</span>
                      <p className="font-medium text-slate-800 dark:text-zinc-100 mt-0.5">{formatBytes(item.size)}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-400 dark:text-zinc-500">{t('properties.size')}:</span>
                        <p className="font-medium text-slate-800 dark:text-zinc-100 mt-0.5">
                          {item.isCalculatingStats ? (
                            <span className="text-amber-500/80 dark:text-amber-400/80 text-xs animate-pulse">
                              {t('common.calculating')}
                            </span>
                          ) : (
                            formatBytes(item.size)
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 dark:text-zinc-500">{t('properties.subitems')}:</span>
                        <p className="font-medium text-slate-800 dark:text-zinc-100 mt-0.5">
                          {item.isCalculatingStats ? (
                            <span className="text-amber-500/80 dark:text-amber-400/80 text-xs animate-pulse">
                              {t('common.calculating')}
                            </span>
                          ) : item.subitemsCount !== undefined && item.subitemsCount !== null ? (
                            <span>
                              {item.subitemsCount === 1
                                ? `1 ${t('common.item')}`
                                : `${item.subitemsCount} ${t('common.items')}`}
                              {item.filesCount !== undefined && item.directoriesCount !== undefined && (
                                <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] block mt-0.5">
                                  ({item.filesCount} {t('properties.filesCount').toLowerCase()}, {item.directoriesCount} {t('properties.directoriesCount').toLowerCase()})
                                </span>
                              )}
                            </span>
                          ) : (
                            '--'
                          )}
                        </p>
                      </div>
                    </>
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
                        {listing.currentFolderStats && (
                          <>
                            <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-zinc-800 text-[11px]">
                              <span>Tamanho do Diretório:</span>
                              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                                {listing.currentFolderStats.isCalculating ? (
                                  <span className="text-amber-500/80 animate-pulse">{t('common.calculating')}</span>
                                ) : (
                                  formatBytes(listing.currentFolderStats.totalBytes)
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Total Subitens (Recursivo):</span>
                              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                                {listing.currentFolderStats.isCalculating ? (
                                  <span className="text-amber-500/80 animate-pulse">{t('common.calculating')}</span>
                                ) : (
                                  `${listing.currentFolderStats.totalSubitemsCount} (${listing.currentFolderStats.filesCount} arq, ${listing.currentFolderStats.directoriesCount} dir)`
                                )}
                              </span>
                            </div>
                          </>
                        )}
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
