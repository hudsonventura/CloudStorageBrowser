import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Helper to escape HTML characters
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Inline formatting helper
  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let current = text;
    let key = 0;

    // Pattern for inline code, links, images, bold/italic, strikethrough
    while (current.length > 0) {
      // Inline Code: `code`
      const codeMatch = current.match(/^`([^`]+)`/);
      if (codeMatch) {
        nodes.push(
          <code
            key={key++}
            className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 font-mono text-xs border border-slate-200 dark:border-zinc-700"
          >
            {codeMatch[1]}
          </code>
        );
        current = current.slice(codeMatch[0].length);
        continue;
      }

      // Image: ![alt](url)
      const imgMatch = current.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        nodes.push(
          <img
            key={key++}
            src={imgMatch[2]}
            alt={imgMatch[1]}
            className="max-w-full my-2 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm"
          />
        );
        current = current.slice(imgMatch[0].length);
        continue;
      }

      // Link: [text](url)
      const linkMatch = current.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 font-medium underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-0.5"
          >
            <span>{linkMatch[1]}</span>
            <ExternalLink className="w-3 h-3 inline-block shrink-0 ml-0.5 opacity-70" />
          </a>
        );
        current = current.slice(linkMatch[0].length);
        continue;
      }

      // Bold + Italic: ***text*** or ___text___
      const boldItalicMatch = current.match(/^(\*\*\*|___)(.*?)\1/);
      if (boldItalicMatch) {
        nodes.push(
          <strong key={key++} className="font-bold italic">
            {renderInline(boldItalicMatch[2])}
          </strong>
        );
        current = current.slice(boldItalicMatch[0].length);
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = current.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        nodes.push(
          <strong key={key++} className="font-bold text-slate-900 dark:text-white">
            {renderInline(boldMatch[2])}
          </strong>
        );
        current = current.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = current.match(/^(\*|_)(.*?)\1/);
      if (italicMatch) {
        nodes.push(
          <em key={key++} className="italic text-slate-800 dark:text-zinc-200">
            {renderInline(italicMatch[2])}
          </em>
        );
        current = current.slice(italicMatch[0].length);
        continue;
      }

      // Strikethrough: ~~text~~
      const strikeMatch = current.match(/^~~(.*?)~~/);
      if (strikeMatch) {
        nodes.push(
          <del key={key++} className="line-through text-slate-400 dark:text-zinc-500">
            {renderInline(strikeMatch[1])}
          </del>
        );
        current = current.slice(strikeMatch[0].length);
        continue;
      }

      // Plain text character
      const nextSpecial = current.search(/[`!\[\*_~]/);
      if (nextSpecial === -1) {
        nodes.push(<span key={key++}>{current}</span>);
        break;
      } else if (nextSpecial === 0) {
        // Character looked special but didn't match full pattern
        nodes.push(<span key={key++}>{current[0]}</span>);
        current = current.slice(1);
      } else {
        nodes.push(<span key={key++}>{current.slice(0, nextSpecial)}</span>);
        current = current.slice(nextSpecial);
      }
    }

    return nodes;
  };

  // Block-level parsing
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let codeBlockIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block: ```lang
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      const fullCode = codeLines.join('\n');
      const idx = codeBlockIndex++;

      elements.push(
        <div key={`code-${i}`} className="my-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm bg-slate-900 text-slate-100">
          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>{lang || 'code'}</span>
            <button
              onClick={() => copyCode(fullCode, idx)}
              className="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Copiar código"
            >
              {copiedCodeIndex === idx ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-sans">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="font-sans">Copiar</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Horizontal Rule: --- or *** or ___
    if (/^(---|___|\*\*\*)\s*$/.test(line.trim())) {
      elements.push(
        <hr key={`hr-${i}`} className="my-6 border-slate-200 dark:border-zinc-800" />
      );
      i++;
      continue;
    }

    // Headings: # H1, ## H2, ### H3, etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const inline = renderInline(headingText);

      switch (level) {
        case 1:
          elements.push(
            <h1 key={`h-${i}`} className="text-2xl font-extrabold text-slate-900 dark:text-white pb-2 mb-3 mt-6 border-b border-slate-200 dark:border-zinc-800 tracking-tight">
              {inline}
            </h1>
          );
          break;
        case 2:
          elements.push(
            <h2 key={`h-${i}`} className="text-xl font-bold text-slate-900 dark:text-zinc-100 pb-1.5 mb-2.5 mt-5 border-b border-slate-100 dark:border-zinc-850 tracking-tight">
              {inline}
            </h2>
          );
          break;
        case 3:
          elements.push(
            <h3 key={`h-${i}`} className="text-lg font-bold text-slate-800 dark:text-zinc-200 mb-2 mt-4">
              {inline}
            </h3>
          );
          break;
        case 4:
          elements.push(
            <h4 key={`h-${i}`} className="text-base font-semibold text-slate-800 dark:text-zinc-200 mb-1.5 mt-3">
              {inline}
            </h4>
          );
          break;
        case 5:
          elements.push(
            <h5 key={`h-${i}`} className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1 mt-2 uppercase tracking-wider">
              {inline}
            </h5>
          );
          break;
        default:
          elements.push(
            <h6 key={`h-${i}`} className="text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1 mt-2">
              {inline}
            </h6>
          );
          break;
      }
      i++;
      continue;
    }

    // Blockquote: > text
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-blue-500 pl-4 py-1.5 my-3 bg-blue-50/50 dark:bg-zinc-850/50 rounded-r-xl text-slate-700 dark:text-zinc-300 italic text-sm space-y-1"
        >
          {quoteLines.map((ql, qidx) => (
            <p key={qidx}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Markdown Table: lines starting and containing |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCols = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());

        // Skip separator line tableLines[1] (e.g. |---|---|)
        const rowLines = tableLines.slice(2);

        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-zinc-850 text-slate-800 dark:text-zinc-200 font-bold border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  {headerCols.map((h, hidx) => (
                    <th key={hidx} className="px-4 py-2.5">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {rowLines.map((row, ridx) => {
                  const cells = row.split('|').slice(1, -1).map(c => c.trim());
                  return (
                    <tr
                      key={ridx}
                      className="even:bg-slate-50/60 dark:even:bg-zinc-850/30 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {cells.map((cell, cidx) => (
                        <td key={cidx} className="px-4 py-2 text-slate-700 dark:text-zinc-300">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Task list items or Unordered Lists
    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      elements.push(
        <div key={`task-${i}`} className="flex items-start space-x-2.5 my-1.5 text-sm text-slate-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="mt-1 w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-zinc-700 focus:ring-blue-500 bg-white dark:bg-zinc-800"
          />
          <span className={isChecked ? 'line-through text-slate-400 dark:text-zinc-500' : ''}>
            {renderInline(taskMatch[3])}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Unordered List: - item or * item
    if (/^\s*[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 text-sm text-slate-700 dark:text-zinc-300 ml-2">
          {listItems.map((item, lidx) => (
            <li key={lidx} className="leading-relaxed">
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List: 1. item
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 text-sm text-slate-700 dark:text-zinc-300 ml-2">
          {listItems.map((item, lidx) => (
            <li key={lidx} className="leading-relaxed">
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^(#{1,6})\s+/) &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('|') &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(---|___|\*\*\*)\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    elements.push(
      <p key={`p-${i}`} className="my-2.5 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
        {paraLines.map((pl, pidx) => (
          <React.Fragment key={pidx}>
            {renderInline(pl)}
            {pidx < paraLines.length - 1 && ' '}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return (
    <div className={`markdown-body select-text text-slate-800 dark:text-zinc-200 ${className}`}>
      {elements.length === 0 ? (
        <p className="text-slate-400 dark:text-zinc-500 italic text-sm">Arquivo markdown vazio.</p>
      ) : (
        elements
      )}
    </div>
  );
};
