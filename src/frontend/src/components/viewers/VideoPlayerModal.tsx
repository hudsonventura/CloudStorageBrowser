import React from 'react';
import { X, Download } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';

interface VideoPlayerModalProps {
  item: FileItem;
  snapshotName?: string | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ item, snapshotName, onClose }) => {
  const { selectedDataset } = useDataset();

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
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between animate-in fade-in">
      {/* Top Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between text-white border-b border-zinc-800 bg-zinc-950/80">
        <div className="truncate mr-4">
          <p className="font-semibold text-sm truncate">{item.name}</p>
          {snapshotName && (
            <p className="text-xs text-amber-400 font-mono">Snapshot: {snapshotName}</p>
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Container */}
      <div className="flex-1 w-full flex items-center justify-center p-6 bg-black">
        {isAudio ? (
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center">
            <p className="text-white font-bold text-lg mb-4">{item.name}</p>
            <audio controls autoPlay src={rawUrl} className="w-full" />
          </div>
        ) : (
          <video
            controls
            autoPlay
            src={rawUrl}
            className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-2xl bg-black border border-zinc-800"
          />
        )}
      </div>
    </div>
  );
};
