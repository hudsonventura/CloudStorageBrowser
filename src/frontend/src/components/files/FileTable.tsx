import React from 'react';
import { Folder, FileText, ShieldCheck, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { FileItem, SortField } from '../../types';
import { useDataset } from '../../context/DatasetContext';

interface FileTableProps {
  items: FileItem[];
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onOpenFile: (item: FileItem) => void;
}

export const FileTable: React.FC<FileTableProps> = ({ items, onContextMenu, onOpenFile }) => {
  const { navigateTo, selectedItem, setSelectedItem, sortBy, setSortBy, sortDirection, setSortDirection } = useDataset();

  if (items.length === 0) return null;

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'Ascending' ? 'Descending' : 'Ascending');
    } else {
      setSortBy(field);
      setSortDirection('Ascending');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortBy === field) {
      return sortDirection === 'Ascending' ? (
        <ArrowUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      );
    }
    return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-400 font-bold uppercase tracking-wider select-none">
          <tr>
            <th
              onClick={() => handleSort('Name')}
              className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-zinc-200 transition-colors group"
            >
              <div className="flex items-center space-x-1.5">
                <span>Nome</span>
                {renderSortIcon('Name')}
              </div>
            </th>
            <th
              onClick={() => handleSort('Size')}
              className="py-3 px-4 w-32 cursor-pointer hover:text-slate-700 dark:hover:text-zinc-200 transition-colors group"
            >
              <div className="flex items-center space-x-1.5">
                <span>Tamanho</span>
                {renderSortIcon('Size')}
              </div>
            </th>
            <th
              onClick={() => handleSort('LastModified')}
              className="py-3 px-4 w-44 cursor-pointer hover:text-slate-700 dark:hover:text-zinc-200 transition-colors group"
            >
              <div className="flex items-center space-x-1.5">
                <span>Modificado Em</span>
                {renderSortIcon('LastModified')}
              </div>
            </th>
            <th
              onClick={() => handleSort('Extension')}
              className="py-3 px-4 w-24 cursor-pointer hover:text-slate-700 dark:hover:text-zinc-200 transition-colors group"
            >
              <div className="flex items-center space-x-1.5">
                <span>Tipo</span>
                {renderSortIcon('Extension')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300">
          {items.map((item) => {
            const isSelected = selectedItem?.relativePath === item.relativePath;

            return (
              <tr
                key={item.relativePath}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', item.relativePath);
                }}
                onClick={() => {
                  setSelectedItem(item);
                }}
                onDoubleClick={() => {
                  if (item.type === 'Directory') {
                    navigateTo(item.relativePath);
                  } else {
                    onOpenFile(item);
                  }
                }}
                onContextMenu={(e) => onContextMenu(e, item)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-zinc-800 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <td className="py-2.5 px-4 flex items-center space-x-3">
                  {item.type === 'Directory' ? (
                    <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                  )}
                  <span className="truncate max-w-md">{item.name}</span>
                  {item.hasShadowCopy && (
                    <span title="Snapshots ZFS disponíveis">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-zinc-400">
                  {item.type === 'File' ? formatBytes(item.size) : '--'}
                </td>
                <td className="py-2.5 px-4 text-slate-500 dark:text-zinc-400">
                  {formatDate(item.lastModifiedAtUtc)}
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-400 dark:text-zinc-500 uppercase">
                  {item.type === 'Directory' ? 'Pasta' : item.extension.replace('.', '') || 'Arquivo'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
