import React, { useEffect } from 'react';
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
import { useI18n } from '../../context/I18nContext';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const { t } = useI18n();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: content || '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'tiptap ProseMirror focus:outline-none min-h-0'
      }
    }
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!content || !content.trim()) {
    return (
      <div className={`p-4 text-slate-400 dark:text-zinc-500 italic text-sm ${className}`}>
        {t('viewers.emptyMarkdown')}
      </div>
    );
  }

  return (
    <div className={`obsidian-renderer select-text text-slate-900 dark:text-zinc-100 ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
};
