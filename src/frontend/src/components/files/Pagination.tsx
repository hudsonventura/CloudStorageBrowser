import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export const Pagination: React.FC = () => {
  const { listing, page, setPage, pageSize, setPageSize } = useDataset();

  if (!listing || listing.totalItems === 0) return null;

  const totalPages = listing.totalPages || 1;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, listing.totalItems);

  return (
    <div className="py-3 px-6 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none">
      <div className="flex items-center space-x-4">
        <span>
          Exibindo <span className="font-semibold text-slate-900 dark:text-white">{startItem}-{endItem}</span> de{' '}
          <span className="font-semibold text-slate-900 dark:text-white">{listing.totalItems}</span> itens
        </span>

        {/* Page size dropdown */}
        <div className="flex items-center space-x-1.5">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={50}>50</option>
            <option value={100}>100 (Padrão)</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => setPage(1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Primeira página"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Página anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="px-3 py-1 font-semibold text-slate-800 dark:text-slate-200">
          {page} / {totalPages}
        </span>

        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Próxima página"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setPage(totalPages)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Última página"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
