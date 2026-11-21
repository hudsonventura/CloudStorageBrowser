import React, { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';

interface PdfViewerModalProps {
  item: FileItem;
  snapshotName?: string | null;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ item, snapshotName, onClose }) => {
  const { selectedDataset } = useDataset();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedDataset) return null;

  const token = localStorage.getItem('csb_token') || '';
  let rawUrl = `/api/files/raw?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
  if (token) rawUrl += `&token=${encodeURIComponent(token)}`;
  if (snapshotName) rawUrl += `&snapshotName=${encodeURIComponent(snapshotName)}`;

  let downloadUrl = `/api/files/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
  if (token) downloadUrl += `&token=${encodeURIComponent(token)}`;
  if (snapshotName) downloadUrl += `&snapshotName=${encodeURIComponent(snapshotName)}`;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between animate-in fade-in"
    >
      {/* Top Bar */}
      <div className="w-full px-6 py-3.5 flex items-center justify-between text-white border-b border-zinc-800 bg-zinc-950 z-20">
        <div className="truncate mr-4">
          <p className="font-semibold text-sm truncate">{item.name}</p>
          {snapshotName && (
            <p className="text-xs text-amber-400 font-mono">Snapshot: {snapshotName}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={rawUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title="Abrir em nova janela"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={downloadUrl}
            download={item.name}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title="Baixar PDF"
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

      {/* PDF Frame */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="flex-1 w-full p-4 flex items-center justify-center bg-black/40"
      >
        <iframe
          src={rawUrl}
          title={item.name}
          className="w-full h-full max-w-6xl rounded-2xl border border-zinc-800 shadow-2xl bg-white"
        />
      </div>
    </div>
  );
};
