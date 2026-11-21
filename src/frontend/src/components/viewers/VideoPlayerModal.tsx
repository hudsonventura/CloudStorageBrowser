import React, { useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';

interface VideoPlayerModalProps {
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

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
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

  let downloadUrl = `/api/files/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
  if (token) downloadUrl += `&token=${encodeURIComponent(token)}`;
  if (snapshotName) downloadUrl += `&snapshotName=${encodeURIComponent(snapshotName)}`;

  const isAudio = item.category === 'Audio';

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
              ({currentIndex} de {totalCount})
            </span>
          )}
          {snapshotName && (
            <span className="text-xs text-amber-400 font-mono ml-2">@{snapshotName}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={downloadUrl}
            download={item.name}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title="Baixar mídia"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors ml-2"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Container with Navigation */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="flex-1 w-full flex items-center justify-center p-6 bg-black relative"
      >
        {/* Navigation Button: Prev < */}
        {hasPrev && onPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700/60 backdrop-blur-md transition-all shadow-2xl hover:scale-110 active:scale-95"
            title="Anterior (Seta Esquerda)"
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
            title="Próximo (Seta Direita)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {isAudio ? (
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center">
            <p className="text-white font-bold text-lg mb-4">{item.name}</p>
            <audio controls autoPlay src={rawUrl} className="w-full" />
          </div>
        ) : (
          <video
            key={item.relativePath}
            controls
            autoPlay
            src={rawUrl}
            className="max-h-[80vh] max-w-[85vw] rounded-2xl shadow-2xl bg-black border border-zinc-800"
          />
        )}
      </div>
    </div>
  );
};
