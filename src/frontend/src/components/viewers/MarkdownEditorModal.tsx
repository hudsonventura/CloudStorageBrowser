import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
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
  Table as TableIcon,
  Minus,
  Undo2,
  Redo2,
  RefreshCw,
  AlertCircle,
  Check,
  FileText,
  Maximize2,
  Minimize2,
  Clock,
  CheckCircle2,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { FileItem } from '../../types';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';

interface MarkdownEditorModalProps {
  item: FileItem;
  snapshotName?: string | null;
  onClose: () => void;
}

type ViewMode = 'live' | 'source' | 'reading';

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
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isReadOnly = selectedDataset?.accessMode === 'ReadOnly' || !!snapshotName;
  const isDirty = content !== originalContent;

  // Initialize Tiptap editor for Obsidian In-place Live Editing
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
        tightLists: true,
        bulletListMarker: '-'
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Link.configure({
        openOnClick: false
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: '',
    editable: !isReadOnly && viewMode === 'live',
    editorProps: {
      attributes: {
        class: 'tiptap ProseMirror focus:outline-none min-h-[500px] text-slate-800 dark:text-zinc-100 font-sans'
      }
    },
    onUpdate: ({ editor }) => {
      const md = (editor.storage as any).markdown.getMarkdown();
      setContent(md);
    }
  });

  // Update editor editable state when read-only or viewMode changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly && viewMode === 'live');
    }
  }, [editor, isReadOnly, viewMode]);

  // Load content from API
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
        const loaded = res.data.content ?? '';
        setContent(loaded);
        setOriginalContent(loaded);
        if (editor) {
          editor.commands.setContent(loaded);
        }
      })
      .catch(err => {
        setMessage({
          text: err?.response?.data?.message || t('viewers.loadError'),
          isError: true
        });
      })
      .finally(() => setIsLoading(false));
  }, [item.relativePath, selectedDataset?.id, snapshotName, t, editor]);

  // Handle switching view modes: sync content between Tiptap and Source textarea
  const handleModeChange = (newMode: ViewMode) => {
    if (newMode === viewMode) return;
    if (viewMode === 'live' && editor) {
      // Sync from tiptap to content
      const md = (editor.storage as any).markdown.getMarkdown();
      setContent(md);
    } else if (newMode === 'live' && editor) {
      // Sync from content to tiptap
      editor.commands.setContent(content);
    }
    setViewMode(newMode);
  };

  // Save handler
  const handleSave = useCallback(async () => {
    if (!selectedDataset || isReadOnly || isSaving || isLoading || !isDirty) return;
    setIsSaving(true);
    setMessage(null);

    // Make sure we have the latest markdown content
    let textToSave = content;
    if (viewMode === 'live' && editor) {
      textToSave = (editor.storage as any).markdown.getMarkdown();
    }

    try {
      await apiClient.put('/files/content', {
        datasetId: selectedDataset.id,
        relativePath: item.relativePath,
        content: textToSave
      });
      setOriginalContent(textToSave);
      setContent(textToSave);
      setMessage({ text: t('viewers.saveSuccess'), isError: false });
      refreshListing();
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.message || t('viewers.saveError'),
        isError: true
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedDataset, isReadOnly, isSaving, isLoading, isDirty, item.relativePath, content, viewMode, editor, refreshListing, t]);

  // Keyboard shortcut for Save (Ctrl+S / Cmd+S) and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isFullscreen, onClose]);

  // Statistics calculation (Obsidian style)
  const stats = React.useMemo(() => {
    const lines = content ? content.split('\n').length : 0;
    const chars = content.length;
    const trimmed = content.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    return { lines, chars, words, readMinutes };
  }, [content]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) onClose();
      }}
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in ${
        isFullscreen ? 'p-0' : 'p-3 md:p-6'
      }`}
    >
      <div
        className={`bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-2xl transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-6xl h-[92vh] rounded-3xl'
        }`}
      >
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/90 dark:bg-zinc-950/80 backdrop-blur-sm shrink-0">
          {/* File Information */}
          <div className="flex items-center space-x-3 truncate mr-4">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2 truncate">
              <span className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate" title={item.name}>
                {item.name}
              </span>
              {isDirty && !isReadOnly && (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20 animate-pulse shrink-0"
                  title={t('viewers.unsavedChanges')}
                />
              )}
            </div>
            {snapshotName && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                @{snapshotName.replace(/^@/, '')}
              </span>
            )}
            {isReadOnly && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                {t('common.readOnly')}
              </span>
            )}
          </div>

          {/* Mode Switcher Tabs (Obsidian: Single View Live / Source / Reading) */}
          <div className="flex items-center bg-slate-200/70 dark:bg-zinc-850 p-1 rounded-xl text-xs font-semibold space-x-1 shadow-inner">
            <button
              onClick={() => handleModeChange('live')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'live'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Obsidian Live Preview (Editor com renderização no mesmo texto)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('viewers.livePreview')}</span>
            </button>
            <button
              onClick={() => handleModeChange('source')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'source'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Código Markdown puro"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{t('viewers.source')}</span>
            </button>
            <button
              onClick={() => handleModeChange('reading')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'reading'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Modo Leitura"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('viewers.reading')}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading || !isDirty}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('viewers.ctrlSToSave')}
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? t('common.saving') : t('common.save')}</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              title={isFullscreen ? t('viewers.exitFullscreen') : t('viewers.fullscreen')}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`px-6 py-2 text-xs flex items-center space-x-2 border-b shrink-0 animate-in slide-in-from-top-1 ${
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

        {/* Formatting Toolbar (Visible in Live Editing mode) */}
        {!isReadOnly && viewMode === 'live' && editor && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#141417] flex items-center space-x-0.5 overflow-x-auto shrink-0 select-none text-slate-700 dark:text-zinc-300">
            {/* Bold */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('bold')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Negrito (**texto**)"
            >
              <Bold className="w-4 h-4" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('italic')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Itálico (*texto*)"
            >
              <Italic className="w-4 h-4" />
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('strike')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Tachado (~~texto~~)"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800 mx-1 shrink-0" />

            {/* Headings */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Título 1 (# )"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Título 2 (## )"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('heading', { level: 3 })
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Título 3 (### )"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800 mx-1 shrink-0" />

            {/* Blockquote */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('blockquote')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Citação (> )"
            >
              <Quote className="w-4 h-4" />
            </button>

            {/* Inline Code */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('code')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Código em linha (`código`)"
            >
              <Code className="w-4 h-4" />
            </button>

            {/* Code Block */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('codeBlock')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Bloco de código (``` )"
            >
              <FileCode className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800 mx-1 shrink-0" />

            {/* Bullet List */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('bulletList')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Lista com marcadores (- )"
            >
              <List className="w-4 h-4" />
            </button>

            {/* Ordered List */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('orderedList')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Lista numerada (1. )"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Task List */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1.5 rounded-lg transition-colors ${
                editor.isActive('taskList')
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-200/60 dark:hover:bg-zinc-800'
              }`}
              title="Lista de tarefas (- [ ] )"
            >
              <CheckSquare className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800 mx-1 shrink-0" />

            {/* Table */}
            <button
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              title="Inserir Tabela"
            >
              <TableIcon className="w-4 h-4" />
            </button>

            {/* Horizontal Rule */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              title="Divisor horizontal (---)"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex-1" />

            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Workspace: Single-View Unified Canvas */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative bg-white dark:bg-[#18181b]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center space-x-2 text-slate-400 dark:text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-sm font-medium">{t('common.loading')}</span>
            </div>
          ) : (
            <>
              {/* Live Preview Mode (Single view, in-place WYSIWYG) OR Reading Mode */}
              {(viewMode === 'live' || viewMode === 'reading') && (
                <div
                  className="flex-1 overflow-y-auto px-6 py-8 md:px-16 lg:px-24 bg-white dark:bg-[#18181b] text-slate-900 dark:text-zinc-100 cursor-text select-text"
                  onClick={() => {
                    if (viewMode === 'live' && editor && !editor.isFocused) {
                      editor.commands.focus();
                    }
                  }}
                >
                  <div className="max-w-4xl mx-auto w-full">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              )}

              {/* Source Mode (Raw Markdown code editor) */}
              {viewMode === 'source' && (
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-zinc-950/50">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    readOnly={isReadOnly}
                    placeholder="Markdown..."
                    className="w-full h-full max-w-4xl mx-auto block font-mono text-sm leading-relaxed resize-none bg-transparent text-slate-800 dark:text-zinc-100 focus:outline-none placeholder-slate-400 dark:placeholder-zinc-600"
                    spellCheck={false}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Status Bar (Obsidian Style) */}
        <div className="px-5 py-2 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 shrink-0 select-none">
          {/* Left stats */}
          <div className="flex items-center space-x-3 divide-x divide-slate-200 dark:divide-zinc-800">
            <div className="flex items-center space-x-2">
              <span>{stats.lines} {t('viewers.lines')}</span>
              <span>•</span>
              <span>{stats.words} {t('viewers.words')}</span>
              <span>•</span>
              <span>{stats.chars} {t('viewers.chars')}</span>
            </div>
            <div className="pl-3 hidden md:flex items-center space-x-1.5 text-slate-400 dark:text-zinc-500">
              <Clock className="w-3 h-3" />
              <span>{t('viewers.readTime').replace('{minutes}', stats.readMinutes.toString())}</span>
            </div>
          </div>

          {/* Right status */}
          <div className="flex items-center space-x-3">
            {isDirty && !isReadOnly ? (
              <span className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{t('viewers.unsavedChanges')}</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>{t('viewers.allChangesSaved')}</span>
              </span>
            )}
            <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-slate-400 dark:text-zinc-500">
              {t('viewers.ctrlSToSave')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
