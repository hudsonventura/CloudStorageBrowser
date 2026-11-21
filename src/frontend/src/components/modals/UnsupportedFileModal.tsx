import React, { useEffect } from 'react';
import { X, Download, FileWarning, FileQuestion, HardDrive, Calendar } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';

interface UnsupportedFileModalProps {
  item: FileItem;
  snapshotName?: string | null;
  onClose: () => void;
  onDownload: (item: FileItem) => void;
}

export const UnsupportedFileModal: React.FC<UnsupportedFileModalProps> = ({
  item,
  snapshotName,
  onClose,
  onDownload
}) => {
  const { selectedDataset } = useDataset();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const ext = item.extension ? item.extension.replace('.', '').toUpperCase() : 'ARQUIVO';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2 truncate mr-3">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
              {ext}
            </span>
            <span className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate" title={item.name}>
              {item.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Icon & Notice */}
        <div className="text-center space-y-3 py-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center mx-auto text-amber-500 shadow-sm">
            <FileWarning className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pré-visualização Indisponível
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Este arquivo não possui suporte a pré-visualização direta no navegador. Faça o download para executá-lo ou visualizá-lo localmente.
            </p>
          </div>
        </div>

        {/* File Specs */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 text-xs space-y-2 text-slate-600 dark:text-zinc-300">
          <div className="flex justify-between">
            <span className="text-slate-400 dark:text-zinc-500">Tamanho:</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-100 font-mono">{formatBytes(item.size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 dark:text-zinc-500">Última Modificação:</span>
            <span>{formatDate(item.lastModifiedAtUtc)}</span>
          </div>
          {snapshotName && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>Versão do Snapshot:</span>
              <span className="font-mono font-bold">@{snapshotName}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onDownload(item);
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Arquivo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
