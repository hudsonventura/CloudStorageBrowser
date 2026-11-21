import React, { useState } from 'react';
import { LayoutGrid, List, Table, ArrowUpDown, ChevronDown } from 'lucide-react';
import { ViewMode, SortField, SortDirection } from '../../types';
import { useDataset } from '../../context/DatasetContext';

export const ViewModeToggle: React.FC = () => {
  const { viewMode, setViewMode, sortBy, setSortBy, sortDirection, setSortDirection } = useDataset();
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortOptions: { label: string; field: SortField }[] = [
    { label: 'Nome', field: 'Name' },
    { label: 'Tamanho', field: 'Size' },
    { label: 'Data de Modificação', field: 'LastModified' },
    { label: 'Tipo / Extensão', field: 'Extension' }
  ];

  return (
    <div className="flex items-center space-x-2">
      {/* View Mode Buttons */}
      <div className="flex items-center bg-slate-100 dark:bg-zinc-850 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700">
        <button
          onClick={() => setViewMode('Thumbnails')}
          title="Grade / Miniaturas"
          className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'Thumbnails'
              ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('Details')}
          title="Detalhes"
          className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'Details'
              ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'
          }`}
        >
          <Table className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('List')}
          title="Lista"
          className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'List'
              ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'
          }`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* Sort Menu */}
      <div className="relative">
        <button
          onClick={() => setIsSortOpen(!isSortOpen)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
          <span>Ordenar</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
        </button>

        {isSortOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-30 text-xs">
            {sortOptions.map(opt => (
              <button
                key={opt.field}
                onClick={() => {
                  if (sortBy === opt.field) {
                    setSortDirection(sortDirection === 'Ascending' ? 'Descending' : 'Ascending');
                  } else {
                    setSortBy(opt.field);
                    setSortDirection('Ascending');
                  }
                  setIsSortOpen(false);
                }}
                className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                  sortBy === opt.field ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-zinc-300'
                }`}
              >
                <span>{opt.label}</span>
                {sortBy === opt.field && (
                  <span className="text-[10px] text-blue-500">
                    {sortDirection === 'Ascending' ? '▲ Cresc' : '▼ Decresc'}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
