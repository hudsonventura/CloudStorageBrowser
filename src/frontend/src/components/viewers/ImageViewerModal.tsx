import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';

interface ImageViewerModalProps {
  item: FileItem;
  snapshotName?: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  item,
  snapshotName,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount
}) => {
  const { selectedDataset } = useDataset();
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Reset zoom and rotation when item changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setIsLoading(true);
    setHasError(false);
  }, [item.relativePath]);

  // Keyboard navigation & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  if (!selectedDataset) return null;

  const token = localStorage.getItem('csb_token') || '';
  let rawUrl = `/api/files/raw?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
  if (token) rawUrl += `&token=${encodeURIComponent(token)}`;
  if (snapshotName) rawUrl += `&snapshotName=${encodeURIComponent(snapshotName)}`;
  if (retryKey > 0) rawUrl += `&_r=${retryKey}`;

  let downloadUrl = `/api/files/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
  if (token) downloadUrl += `&token=${encodeURIComponent(token)}`;
  if (snapshotName) downloadUrl += `&snapshotName=${encodeURIComponent(snapshotName)}`;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between animate-in fade-in select-none"
    >
      {/* Top Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between text-white border-b border-zinc-800 bg-zinc-950/80 z-20">
        <div className="truncate mr-4 flex items-center space-x-2">
          <p className="font-semibold text-sm truncate">{item.name}</p>
          {currentIndex && totalCount && (
            <span className="text-xs text-zinc-400 font-mono">
              ({currentIndex} {t('viewers.of')} {totalCount})
            </span>
          )}
          {snapshotName && (
            <span className="text-xs text-amber-400 font-mono ml-2">@{snapshotName}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title={t('viewers.zoomIn')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title={t('viewers.zoomOut')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title={t('viewers.rotate')}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <a
            href={downloadUrl}
            download={item.name}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title={t('viewers.downloadMedia')}
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors ml-2"
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="flex-1 w-full flex items-center justify-center overflow-hidden p-6 relative bg-black"
      >
        {/* Navigation Button: Prev < */}
        {hasPrev && onPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 backdrop-blur-md transition-all shadow-2xl hover:scale-110 active:scale-95"
            title={t('viewers.previous')}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Navigation Button: Next > */}
        {hasNext && onNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 backdrop-blur-md transition-all shadow-2xl hover:scale-110 active:scale-95"
            title={t('viewers.next')}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-zinc-400">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">{t('common.loading')}</p>
          </div>
        )}

        {hasError ? (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl text-center max-w-md mx-auto space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">{t('viewers.failedToLoadImage')}</h3>
            <p className="text-xs text-zinc-400">{t('viewers.checkPermissions')}</p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                setRetryKey(prev => prev + 1);
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-xl flex items-center space-x-1.5 mx-auto transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('viewers.retry')}</span>
            </button>
          </div>
        ) : (
          <img
            src={rawUrl}
            alt={item.name}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className={`max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}
      </div>
    </div>
  );
};
