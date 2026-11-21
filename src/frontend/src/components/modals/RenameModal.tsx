import React, { useState } from 'react';
import { X, Edit3 } from 'lucide-react';
import { FileItem } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';

interface RenameModalProps {
  item: FileItem;
  onClose: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({ item, onClose }) => {
  const { selectedDataset, refreshListing } = useDataset();
  const [newName, setNewName] = useState(item.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedDataset || newName === item.name) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/files/rename', {
        datasetId: selectedDataset.id,
        relativePath: item.relativePath,
        newName: newName.trim()
      });
      refreshListing();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao renomear');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-base">
            <Edit3 className="w-5 h-5 text-amber-500" />
            <span>Renomear</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Novo Nome
            </label>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
            >
              Renomear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
