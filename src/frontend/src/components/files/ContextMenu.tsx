import React from 'react';
import { Eye, Download, Edit3, Trash2, Copy, Move, Info, History } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';

interface ContextMenuProps {
  x: number;
  y: number;
  item: FileItem;
  onClose: () => void;
  onOpen: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onCopy: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onShowProperties: (item: FileItem) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onCopy,
  onMove,
  onShowProperties
}) => {
  const { selectedDataset, snapshotName } = useDataset();
  const isReadOnly = selectedDataset?.accessMode === 'ReadOnly' || !!snapshotName;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-50 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95"
    >
      <button
        onClick={() => { onClose(); onOpen(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-2.5"
      >
        <Eye className="w-4 h-4 text-blue-500" />
        <span>Abrir / Visualizar</span>
      </button>

      {item.type === 'File' && (
        <button
          onClick={() => { onClose(); onDownload(item); }}
          className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-2.5"
        >
          <Download className="w-4 h-4 text-emerald-500" />
          <span>Baixar</span>
        </button>
      )}

      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

      <button
        disabled={isReadOnly}
        onClick={() => { onClose(); onRename(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Edit3 className="w-4 h-4 text-amber-500" />
        <span>Renomear</span>
      </button>

      <button
        disabled={isReadOnly}
        onClick={() => { onClose(); onCopy(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Copy className="w-4 h-4 text-indigo-500" />
        <span>Copiar</span>
      </button>

      <button
        disabled={isReadOnly}
        onClick={() => { onClose(); onMove(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Move className="w-4 h-4 text-cyan-500" />
        <span>Mover</span>
      </button>

      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

      <button
        onClick={() => { onClose(); onShowProperties(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center space-x-2.5"
      >
        <Info className="w-4 h-4 text-blue-500" />
        <span>Propriedades & Versões</span>
      </button>

      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

      <button
        disabled={isReadOnly}
        onClick={() => { onClose(); onDelete(item); }}
        className="w-full px-3.5 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center space-x-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
        <span>Excluir</span>
      </button>
    </div>
  );
};
