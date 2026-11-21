import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { FileItem } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';

interface DeleteModalProps {
  item: FileItem;
  onClose: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ item, onClose }) => {
  const { selectedDataset, refreshListing, setSelectedItem } = useDataset();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDelete = async () => {
    if (!selectedDataset) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiClient.post('/files/delete', {
        datasetId: selectedDataset.id,
        relativePath: item.relativePath
      });
      setSelectedItem(null);
      refreshListing();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir item');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center space-x-3 text-red-600 mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Confirmar Exclusão</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Esta ação não poderá ser desfeita.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-slate-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800 mb-6 text-xs">
          <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{item.name}</p>
          <p className="text-slate-400 dark:text-zinc-500 font-mono text-[11px] mt-0.5">/{item.relativePath}</p>
        </div>

        <div className="flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir Definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
};
