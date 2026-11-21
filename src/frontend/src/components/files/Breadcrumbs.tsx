import React from 'react';
import { ChevronRight, Home, RefreshCw } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export const Breadcrumbs: React.FC = () => {
  const { selectedDataset, currentPath, navigateTo, refreshListing, isLoading } = useDataset();

  const segments = currentPath ? currentPath.split('/').filter(Boolean) : [];

  return (
    <div className="flex items-center justify-between py-2 text-sm text-slate-600 dark:text-slate-400">
      <nav className="flex items-center space-x-1.5 flex-wrap">
        <button
          onClick={() => navigateTo('')}
          className="flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors font-medium text-slate-800 dark:text-slate-200"
        >
          <Home className="w-4 h-4 text-blue-500" />
          <span>{selectedDataset?.name || 'Dataset'}</span>
        </button>

        {segments.map((seg, idx) => {
          const subPath = segments.slice(0, idx + 1).join('/');
          const isLast = idx === segments.length - 1;

          return (
            <React.Fragment key={subPath}>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              {isLast ? (
                <span className="px-2 py-1 font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {seg}
                </span>
              ) : (
                <button
                  onClick={() => navigateTo(subPath)}
                  className="px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors truncate max-w-[150px]"
                >
                  {seg}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <button
        onClick={refreshListing}
        disabled={isLoading}
        title="Atualizar pasta"
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
      </button>
    </div>
  );
};
