import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFit, setIsFit] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Reset zoom, rotation and fit mode when item changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsFit(true);
    setIsLoading(true);
    setHasError(false);
    setIsDragging(false);
  }, [item.relativePath]);

  // Toggle strictly between Fit and 100% Zoom
  const toggleFitZoom = () => {
    if (isFit) {
      // Go directly from Fit to 100%
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsFit(false);
    } else {
      // Go back to Fit
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsFit(true);
    }
  };

  // Keyboard navigation & F toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFitZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, onPrev, onNext, isFit]);

  // Native listeners on stage to prevent middle-click browser autoscroll
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleNativeMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    const handleNativeAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    stage.addEventListener('mousedown', handleNativeMouseDown);
    stage.addEventListener('auxclick', handleNativeAuxClick);

    return () => {
      stage.removeEventListener('mousedown', handleNativeMouseDown);
      stage.removeEventListener('auxclick', handleNativeAuxClick);
    };
  }, []);

  // Mouse wheel zoom when zoom is active (not fit)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (e: WheelEvent) => {
      if (isFit) return;
      e.preventDefault();
      const zoomStep = e.deltaY < 0 ? 0.15 : -0.15;
      setScale(prev => {
        const next = Math.min(Math.max(prev + zoomStep, 0.25), 10);
        return parseFloat(next.toFixed(2));
      });
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [isFit]);

  // Drag-to-pan handlers when in zoom mode (supports middle mouse button 1 & left button 0)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFit || (e.button !== 0 && e.button !== 1)) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      // Stop dragging if neither left (1) nor middle (4) mouse button is pressed
      if ((e.buttons & 1) === 0 && (e.buttons & 4) === 0) {
        setIsDragging(false);
        return;
      }
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition({
        x: dragStart.posX + dx,
        y: dragStart.posY + dy
      });
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 1) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, dragStart]);

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
          {/* Toggle Fit / 100% Zoom button */}
          <button
            onClick={toggleFitZoom}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              !isFit
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
            title={t('viewers.toggleFitZoom')}
          >
            {!isFit ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{!isFit ? `${Math.round(scale * 100)}%` : t('viewers.fitMode')}</span>
            <span className="text-[10px] px-1 py-0.2 bg-black/30 rounded font-mono">F</span>
          </button>

          <button
            onClick={() => {
              setIsFit(false);
              setScale(prev => Math.min(parseFloat((prev + 0.25).toFixed(2)), 10));
            }}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title={t('viewers.zoomIn')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (isFit) return;
              setScale(prev => Math.max(parseFloat((prev - 0.25).toFixed(2)), 0.25));
            }}
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
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onAuxClick={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && isFit) onClose();
        }}
        className={`flex-1 w-full flex items-center justify-center p-6 relative bg-black select-none overflow-hidden ${
          !isFit ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
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
            ref={imgRef}
            src={rawUrl}
            alt={item.name}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className={`object-contain rounded-lg shadow-2xl select-none ${
              isFit ? 'max-h-[85vh] max-w-[85vw]' : 'max-h-none max-w-none'
            } ${isLoading ? 'opacity-0' : 'opacity-100'} ${
              !isFit ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
          />
        )}
      </div>
    </div>
  );
};
