import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';
import { useI18n } from '../../context/I18nContext';

export const Pagination: React.FC = () => {
  const { listing, page, setPage, pageSize, setPageSize } = useDataset();
  const { t } = useI18n();

  const [inputPage, setInputPage] = useState<string>(page.toString());

  useEffect(() => {
    setInputPage(page.toString());
  }, [page]);

  if (!listing || listing.totalItems === 0) return null;

  const totalPages = listing.totalPages || 1;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, listing.totalItems);

  // Range of single-click buttons: 3 pages before and 3 pages after current page
  const prevPages: number[] = [];
  for (let p = Math.max(1, page - 3); p < page; p++) {
    prevPages.push(p);
  }

  const nextPages: number[] = [];
  for (let p = page + 1; p <= Math.min(totalPages, page + 3); p++) {
    nextPages.push(p);
  }

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(inputPage, 10);
    if (!isNaN(parsed)) {
      const target = Math.max(1, Math.min(parsed, totalPages));
      setPage(target);
      setInputPage(target.toString());
    } else {
      setInputPage(page.toString());
    }
  };

  return (
    <div className="py-2.5 px-6 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-zinc-400 select-none transition-colors">
      {/* Left: Summary & Page Size */}
      <div className="flex items-center space-x-3">
        <span>
          {t('pagination.showing', {
            from: startItem.toString(),
            to: endItem.toString(),
            total: listing.totalItems.toString()
          })}
        </span>

        {/* Page size dropdown */}
        <div className="flex items-center space-x-1.5">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          >
            <option value={50}>50 / pág</option>
            <option value={100}>100 / pág</option>
            <option value={250}>250 / pág</option>
            <option value={500}>500 / pág</option>
          </select>
        </div>
      </div>

      {/* Center: 1-Click Page Buttons (3 before, current, 3 after) */}
      <div className="flex items-center space-x-1">
        {/* First Page */}
        <button
          onClick={() => setPage(1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          title={t('pagination.firstPage')}
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          title={t('pagination.previous')}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* If gap from 1 to prevPages exists, show page 1 + ellipsis */}
        {prevPages.length > 0 && prevPages[0] > 1 && (
          <>
            <button
              onClick={() => setPage(1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
            >
              1
            </button>
            {prevPages[0] > 2 && (
              <span className="px-1 text-slate-400 dark:text-zinc-600">...</span>
            )}
          </>
        )}

        {/* 3 Pages Before (1-click navigation) */}
        {prevPages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
          >
            {p}
          </button>
        ))}

        {/* Current Page */}
        <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
          {page}
        </span>

        {/* 3 Pages After (1-click navigation) */}
        {nextPages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
          >
            {p}
          </button>
        ))}

        {/* If gap from nextPages to totalPages exists, show ellipsis + last page */}
        {nextPages.length > 0 && nextPages[nextPages.length - 1] < totalPages && (
          <>
            {nextPages[nextPages.length - 1] < totalPages - 1 && (
              <span className="px-1 text-slate-400 dark:text-zinc-600">...</span>
            )}
            <button
              onClick={() => setPage(totalPages)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next Page */}
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          title={t('pagination.next')}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => setPage(totalPages)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          title={t('pagination.lastPage')}
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Direct Page Input (Ir para página) */}
      <form onSubmit={handlePageSubmit} className="flex items-center space-x-1.5">
        <span className="text-slate-400 dark:text-zinc-500 font-medium">{t('pagination.jumpToPage')}:</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={inputPage}
          onChange={(e) => setInputPage(e.target.value)}
          onBlur={handlePageSubmit}
          className="w-12 px-1.5 py-1 text-center font-bold text-xs rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
        />
        <span className="text-slate-400 dark:text-zinc-500 font-medium">/ {totalPages}</span>
        <button
          type="submit"
          className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-colors"
        >
          Ir
        </button>
      </form>
    </div>
  );
};
