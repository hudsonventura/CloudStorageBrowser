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
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.message || 'Erro ao salvar arquivo', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-md">
              {item.name}
            </span>
            {isReadOnly && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                Somente Leitura
              </span>
            )}
            {snapshotName && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                Snapshot: {snapshotName}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {message && (
              <div className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                message.isError ? 'bg-red-100 dark:bg-red-950/50 text-red-600' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600'
              }`}>
                {message.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                <span>{message.text}</span>
              </div>
            )}

            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Salvar Alterações</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 p-4 bg-slate-950 overflow-hidden flex">
          {isLoading ? (
            <div className="w-full flex items-center justify-center text-slate-400 space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Carregando arquivo...</span>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={isReadOnly}
              spellCheck={false}
              className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs leading-relaxed outline-none resize-none p-2 selection:bg-blue-600/40"
            />
          )}
        </div>
      </div>
    </div>
  );
};
