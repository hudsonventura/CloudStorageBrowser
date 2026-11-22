import React from 'react';
import { Eye, Download, Edit3, Trash2, Copy, Move, Info } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';

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
  const { t } = useI18n();
  const isReadOnly = selectedDataset?.accessMode === 'ReadOnly' || !!snapshotName;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-50 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-1.5 text-xs text-slate-700 dark:text-zinc-200 animate-in fade-in zoom-in-95"
    >
      <button
        onClick={() => { onClose(); onOpen(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 transition-colors"
      >
        <Eye className="w-4 h-4 text-blue-500" />
        <span>{t('contextMenu.open')}</span>
      </button>

      {item.type === 'File' && (
        <button
          onClick={() => { onClose(); onDownload(item); }}
          className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <Download className="w-4 h-4 text-emerald-500" />
            <span>{t('contextMenu.download')}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">F9</span>
        </button>
      )}

      <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

      <button
        disabled={isReadOnly}
        onClick={() => { onClose(); onRename(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <div className="flex items-center space-x-2.5">
          <Edit3 className="w-4 h-4 text-amber-500" />
          <span>{t('contextMenu.rename')}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">F2</span>
      </button>

      <button
        disabled={isReadOnly}
        onClick={() => { onClose(); onCopy(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <div className="flex items-center space-x-2.5">
          <Copy className="w-4 h-4 text-indigo-500" />
          <span>{t('contextMenu.copy')}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">F7</span>
      </button>

      <button
        disabled={isReadOnly}
        onClick={() => { onClose(); onMove(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <div className="flex items-center space-x-2.5">
          <Move className="w-4 h-4 text-purple-500" />
          <span>{t('contextMenu.move')}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">F8</span>
      </button>

      <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

      <button
        disabled={isReadOnly}
        onClick={() => { onClose(); onDelete(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <div className="flex items-center space-x-2.5">
          <Trash2 className="w-4 h-4" />
          <span>{t('contextMenu.delete')}</span>
        </div>
        <span className="text-[10px] font-mono text-red-400 dark:text-red-500 bg-red-100/50 dark:bg-red-950/50 px-1.5 py-0.5 rounded">Del</span>
      </button>

      <button
        onClick={() => { onClose(); onShowProperties(item); }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 transition-colors border-t border-slate-100 dark:border-zinc-800 mt-1 pt-2 text-slate-500 dark:text-zinc-400"
      >
        <Info className="w-4 h-4 text-blue-400" />
        <span>{t('contextMenu.properties')}</span>
      </button>
    </div>
  );
};
