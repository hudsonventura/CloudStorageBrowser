import React from 'react';
import { Camera, ArrowLeft, Lock } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export const SnapshotBanner: React.FC = () => {
  const { snapshotName, setSnapshotName } = useDataset();

  if (!snapshotName) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-amber-900 dark:text-amber-200">
      <div className="flex items-center space-x-2.5 text-sm">
        <Camera className="w-4 h-4 text-amber-500 shrink-0" />
        <div>
          <span className="font-semibold">Modo Snapshot (TrueNAS / ZFS):</span>{' '}
          <code className="px-2 py-0.5 rounded bg-amber-500/20 text-xs font-mono font-bold">
            {snapshotName}
          </code>
          <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">
            (Navegação histórica em modo somente leitura)
          </span>
        </div>
      </div>

      <button
        onClick={() => setSnapshotName(null)}
        className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Voltar para versão atual</span>
      </button>
    </div>
  );
};
