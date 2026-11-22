import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  FileCode,
  List,
  ListOrdered,
  CheckSquare,
  Link2,
  Table,
  Minus,
  Columns,
  Eye,
  Edit3,
  RefreshCw,
  AlertCircle,
  Check
} from 'lucide-react';
import { FileItem } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MarkdownEditorModalProps {
  item: FileItem;
  snapshotName?: string | null;
  onClose: () => void;
}

type ViewMode = 'split' | 'edit' | 'preview';

export const MarkdownEditorModal: React.FC<MarkdownEditorModalProps> = ({
  item,
  snapshotName,
  onClose
}) => {
  const { selectedDataset, refreshListing } = useDataset();
  const { t } = useI18n();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReadOnly = selectedDataset?.accessMode === 'ReadOnly' || !!snapshotName;

  // Load content
  useEffect(() => {
    if (!selectedDataset) return;
    setIsLoading(true);
    apiClient
      .get('/files/content', {
        params: {
          datasetId: selectedDataset.id,
          path: item.relativePath,
          snapshotName
        }
      })
      .then(res => {
        setContent(res.data.content);
        setOriginalContent(res.data.content);
      })
      .catch(err => {
        setMessage({
          text: err?.response?.data?.message || t('viewers.loadError'),
          isError: true
        });
      })
      .finally(() => setIsLoading(false));
  }, [item.relativePath, selectedDataset?.id, snapshotName, t]);

  // Keyboard shortcut for Save (Ctrl+S / Cmd+S) and Close (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!isReadOnly && !isSaving && !isLoading) {
          handleSave();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isReadOnly, isSaving, isLoading, content]);

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
      setOriginalContent(content);
      setMessage({ text: t('viewers.saveSuccess'), isError: false });
      refreshListing();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.message || t('viewers.saveError'),
        isError: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to format or wrap text at textarea cursor position
  const applyFormatting = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    const replacement = selected.length > 0 ? selected : defaultPlaceholder;
    const newText = content.substring(0, start) + prefix + replacement + suffix + content.substring(end);

    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + prefix.length;
      const newCursorEnd = newCursorStart + replacement.length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  // Tab key indents by 2 spaces
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      setContent(content.substring(0, start) + '  ' + content.substring(end));

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const isDirty = content !== originalContent;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in"
    >
      <div className="w-full max-w-6xl h-[92vh] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950 shrink-0">
          <div className="flex items-center space-x-3 truncate mr-4">
            <span className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate">
              {item.name}
            </span>
            {isDirty && !isReadOnly && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Alterações não salvas" />
            )}
            {snapshotName && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                @{snapshotName.replace(/^@/, '')}
              </span>
            )}
            {isReadOnly && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {t('common.readOnly')}
              </span>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-200/70 dark:bg-zinc-800 p-0.5 rounded-xl text-xs font-semibold space-x-0.5">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title={t('viewers.split')}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('viewers.split')}</span>
            </button>
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'edit'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title={t('viewers.editor')}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('viewers.editor')}</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title={t('viewers.preview')}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('viewers.preview')}</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading || !isDirty}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
                title={t('viewers.ctrlSToSave')}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? t('common.saving') : t('common.save')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors"
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`px-6 py-2 text-xs flex items-center space-x-2 border-b shrink-0 ${
              message.isError
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {message.isError ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Formatting Toolbar (WYSIWYG controls) */}
        {viewMode !== 'preview' && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center space-x-1 overflow-x-auto shrink-0 select-none text-slate-700 dark:text-zinc-300">
            {/* Bold */}
            <button
              type="button"
              onClick={() => applyFormatting('**', '**', 'negrito')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Negrito (**texto**)"
            >
              <Bold className="w-4 h-4" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => applyFormatting('*', '*', 'itálico')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Itálico (*texto*)"
            >
              <Italic className="w-4 h-4" />
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              onClick={() => applyFormatting('~~', '~~', 'tachado')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Tachado (~~texto~~)"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />

            {/* Headings */}
            <button
              type="button"
              onClick={() => applyFormatting('# ', '', 'Título 1')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Título 1 (# )"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('## ', '', 'Título 2')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Título 2 (## )"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('### ', '', 'Título 3')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Título 3 (### )"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />

            {/* Blockquote */}
            <button
              type="button"
              onClick={() => applyFormatting('> ', '', 'Citação')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Citação (> )"
            >
              <Quote className="w-4 h-4" />
            </button>

            {/* Inline Code */}
            <button
              type="button"
              onClick={() => applyFormatting('`', '`', 'código')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Código em linha (`código`)"
            >
              <Code className="w-4 h-4" />
            </button>

            {/* Code Block */}
            <button
              type="button"
              onClick={() => applyFormatting('```ts\n', '\n```', '// seu código')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Bloco de código (``` )"
            >
              <FileCode className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />

            {/* Unordered List */}
            <button
              type="button"
              onClick={() => applyFormatting('- ', '', 'Item da lista')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Lista com marcadores (- )"
            >
              <List className="w-4 h-4" />
            </button>

            {/* Ordered List */}
            <button
              type="button"
              onClick={() => applyFormatting('1. ', '', 'Primeiro item')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Lista numerada (1. )"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Task List */}
            <button
              type="button"
              onClick={() => applyFormatting('- [ ] ', '', 'Tarefa pendente')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Lista de tarefas (- [ ] )"
            >
              <CheckSquare className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" />

            {/* Link */}
            <button
              type="button"
              onClick={() => applyFormatting('[', '](https://exemplo.com)', 'Texto do Link')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Inserir link ([texto](url))"
            >
              <Link2 className="w-4 h-4" />
            </button>

            {/* Table */}
            <button
              type="button"
              onClick={() =>
                applyFormatting(
                  '| Coluna 1 | Coluna 2 | Coluna 3 |\n|---|---|---|\n| Item 1 | Item 2 | Item 3 |\n'
                )
              }
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Inserir Tabela"
            >
              <Table className="w-4 h-4" />
            </button>

            {/* Horizontal Rule */}
            <button
              type="button"
              onClick={() => applyFormatting('\n---\n')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Linha horizontal (---)"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editor & Preview Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center space-x-2 text-slate-400 dark:text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-sm">{t('common.loading')}</span>
            </div>
          ) : (
            <>
              {/* Textarea Editor */}
              {(viewMode === 'split' || viewMode === 'edit') && (
                <div
                  className={`flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 ${
                    viewMode === 'split' ? 'w-1/2 border-r border-slate-200 dark:border-zinc-800' : 'w-full'
                  }`}
                >
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    readOnly={isReadOnly}
                    placeholder="Markdown..."
                    className="flex-1 w-full p-6 font-mono text-sm leading-relaxed resize-none bg-transparent text-slate-800 dark:text-zinc-200 focus:outline-none placeholder-slate-400 dark:placeholder-zinc-600"
                    spellCheck={false}
                  />
                  <div className="px-6 py-2 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 select-none">
                    <span>
                      {content.split('\n').length} {t('viewers.lines')} | {content.length} {t('viewers.chars')}
                    </span>
                    <span className="hidden sm:inline">{t('viewers.ctrlSToSave')}</span>
                  </div>
                </div>
              )}

              {/* Rendered Markdown Preview */}
              {(viewMode === 'split' || viewMode === 'preview') && (
                <div
                  className={`flex flex-col h-full overflow-y-auto p-6 md:p-8 bg-white dark:bg-[#121215] ${
                    viewMode === 'split' ? 'w-1/2' : 'w-full max-w-4xl mx-auto'
                  }`}
                >
                  <MarkdownRenderer content={content} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
