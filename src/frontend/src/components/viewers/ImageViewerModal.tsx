import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

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
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between animate-in fade-in">
      {/* Top Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between text-white border-b border-zinc-800 bg-zinc-950/80">
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
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            title="Girar"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <a
            href={downloadUrl}
            download={item.name}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
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
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-6 select-none bg-black relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-zinc-400">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Carregando imagem...</p>
          </div>
        )}

        {hasError ? (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl text-center max-w-md mx-auto space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">Não foi possível carregar a imagem</h3>
            <p className="text-xs text-zinc-400">Verifique se o arquivo existe e se você possui permissões de leitura.</p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                setRetryKey(k => k + 1);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
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
              transition: 'transform 0.2s ease-out'
            }}
            className={`max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-lg transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}
      </div>
    </div>
  );
};
