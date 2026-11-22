import React from 'react';
import { FileText, Image as ImageIcon, Video, Music, FileCode, Archive, ShieldCheck } from 'lucide-react';
import { FileItem, FileCategory } from '../../types';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';

interface FileGridProps {
  files: FileItem[];
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onOpenFile: (item: FileItem) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({ files, onContextMenu, onOpenFile }) => {
  const { selectedDataset, snapshotName, selectedItem, setSelectedItem } = useDataset();
  const { t } = useI18n();

  if (files.length === 0) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getRawUrl = (item: FileItem) => {
    if (!selectedDataset) return '';
    const token = localStorage.getItem('csb_token') || '';
    let url = `/api/files/raw?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    if (snapshotName) url += `&snapshotName=${encodeURIComponent(snapshotName)}`;
    return url;
  };

  const getThumbnailUrl = (item: FileItem) => {
    if (!selectedDataset) return '';
    const token = localStorage.getItem('csb_token') || '';
    if (item.extension.toLowerCase() === '.svg') {
      return getRawUrl(item);
    }
    let url = `/api/thumbnails/${selectedDataset.id}?path=${encodeURIComponent(item.relativePath)}&width=360&height=280`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    if (snapshotName) url += `&snapshotName=${encodeURIComponent(snapshotName)}`;
    return url;
  };

  const renderBadge = (category: FileCategory, ext: string) => {
    const label = ext ? ext.replace('.', '').toUpperCase() : 'FILE';
    let color = 'bg-blue-500';

    if (category === 'Image') color = 'bg-rose-500';
    else if (category === 'Video') color = 'bg-purple-500';
    else if (category === 'Audio') color = 'bg-pink-500';
    else if (category === 'Document') color = 'bg-amber-500';
    else if (category === 'Code') color = 'bg-emerald-500';
    else if (category === 'Archive') color = 'bg-orange-500';

    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold text-white tracking-wider shadow-sm ${color}`}>
        {label}
      </span>
    );
  };

  const renderFallbackIcon = (category: FileCategory) => {
    switch (category) {
      case 'Image': return <ImageIcon className="w-12 h-12 text-rose-400/80 stroke-1" />;
      case 'Video': return <Video className="w-12 h-12 text-purple-400/80 stroke-1" />;
      case 'Audio': return <Music className="w-12 h-12 text-pink-400/80 stroke-1" />;
      case 'Code': return <FileCode className="w-12 h-12 text-emerald-400/80 stroke-1" />;
      case 'Archive': return <Archive className="w-12 h-12 text-orange-400/80 stroke-1" />;
      default: return <FileText className="w-12 h-12 text-slate-400 dark:text-zinc-500 stroke-1" />;
    }
  };

  return (
    <div>
      <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-3 px-1">
        {t('browser.files')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => {
          const isSelected = selectedItem?.relativePath === file.relativePath;

          return (
            <div
              key={file.relativePath}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', file.relativePath);
              }}
              onClick={() => {
                setSelectedItem(file);
              }}
              onDoubleClick={() => onOpenFile(file)}
              onContextMenu={(e) => onContextMenu(e, file)}
              className={`group flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border overflow-hidden transition-all cursor-pointer shadow-sm hover:shadow-md select-none ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-zinc-800 ring-2 ring-blue-500/40'
                  : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-black/60 flex items-center justify-center overflow-hidden">
                {file.hasThumbnail ? (
                  <img
                    src={getThumbnailUrl(file)}
                    alt={file.name}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const rawFallback = getRawUrl(file);
                      if (!target.src.includes('/api/files/raw') && rawFallback && file.category === 'Image') {
                        target.src = rawFallback;
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300 pointer-events-none"
                  />
                ) : null}

                {/* Fallback Icon overlay if thumbnail is hidden or non-image */}
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${file.hasThumbnail ? '-z-10' : ''}`}>
                  {renderFallbackIcon(file.category)}
                </div>

                {/* Top Badge */}
                <div className="absolute top-2.5 left-2.5 pointer-events-none">
                  {renderBadge(file.category, file.extension)}
                </div>

                {file.hasShadowCopy && (
                  <div className="absolute top-2.5 right-2.5 pointer-events-none">
                    <span title="TrueNAS Shadow Copy Ativo" className="p-1 rounded bg-black/60 backdrop-blur text-emerald-400 block">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Size */}
              <div className="p-3">
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 truncate block" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                  {formatBytes(file.size)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
