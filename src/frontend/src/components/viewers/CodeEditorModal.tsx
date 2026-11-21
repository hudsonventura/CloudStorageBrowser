import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { FileItem } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';

interface CodeEditorModalProps {
  item: FileItem;
  snapshotName?: string | null;
  onClose: () => void;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({ item, snapshotName, onClose }) => {
  const { selectedDataset, refreshListing } = useDataset();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const isReadOnly = selectedDataset?.accessMode === 'ReadOnly' || !!snapshotName;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!selectedDataset) return;
    setIsLoading(true);
    apiClient.get('/files/content', {
      params: {
        datasetId: selectedDataset.id,
        path: item.relativePath,
        snapshotName
      }
    })
    .then(res => setContent(res.data.content))
    .catch(err => {
      setMessage({ text: err?.response?.data?.message || 'Falha ao carregar conteúdo', isError: true });
    })
    .finally(() => setIsLoading(false));
  }, [item.relativePath, selectedDataset?.id, snapshotName]);

  const handleSave = async () => {
    if (!selectedDataset || isReadOnly) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await apiClient.put('/files/content', {
        datasetId: selectedDataset.id,
        relativePath: item.relativePath,
        content
      });
      setMessage({ text: 'Arquivo salvo com sucesso!', isError: false });
      refreshListing();
      setTimeout(() => setMessage(null), 2500);
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.message || 'Erro ao salvar arquivo', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
          <div className="flex items-center space-x-3 truncate mr-4">
            <span className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate">{item.name}</span>
            {isReadOnly && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Somente Leitura
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`px-6 py-2 text-xs flex items-center space-x-2 ${
            message.isError
              ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-b border-red-200 dark:border-red-900/50'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-900/50'
          }`}>
            {message.isError ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Check className="w-3.5 h-3.5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 p-4 relative overflow-hidden bg-slate-50/50 dark:bg-zinc-950">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-xs">Carregando conteúdo...</span>
            </div>
          ) : (
            <textarea
              value={content}
              readOnly={isReadOnly}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-xs bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-blue-500/50"
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};
