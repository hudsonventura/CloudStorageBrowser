import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';

interface ImageViewerModalProps {
  item: FileItem;
  snapshotName?: string | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ item, snapshotName, onClose }) => {
  const { selectedDataset } = useDataset();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!selectedDataset) return null;

  let rawUrl = `/api/files/raw?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
  if (snapshotName) rawUrl += `&snapshotName=${encodeURIComponent(snapshotName)}`;

  let downloadUrl = `/api/files/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
  if (snapshotName) downloadUrl += `&snapshotName=${encodeURIComponent(snapshotName)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between animate-in fade-in">
      {/* Top Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between text-white border-b border-white/10">
        <div className="truncate mr-4">
          <p className="font-semibold text-sm truncate">{item.name}</p>
          {snapshotName && (
            <p className="text-xs text-amber-400 font-mono">Versão do Snapshot: {snapshotName}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Girar"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <a
            href={downloadUrl}
            download={item.name}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Baixar imagem"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors ml-2"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-6 select-none">
        <img
          src={rawUrl}
          alt={item.name}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-out'
          }}
          className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-lg"
        />
      </div>
    </div>
  );
};
