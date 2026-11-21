import React from 'react';
import { Folder, ShieldCheck } from 'lucide-react';
import { FileItem } from '../../types';
import { useDataset } from '../../context/DatasetContext';

interface FolderCardsProps {
  folders: FileItem[];
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onDropOnFolder: (sourcePath: string, targetFolderPath: string) => void;
}

export const FolderCards: React.FC<FolderCardsProps> = ({ folders, onContextMenu, onDropOnFolder }) => {
  const { navigateTo, selectedItem, setSelectedItem, setIsPropertiesOpen } = useDataset();

  if (folders.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-3 px-1">
        Pastas
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {folders.map((folder) => {
          const isSelected = selectedItem?.relativePath === folder.relativePath;

          return (
            <div
              key={folder.relativePath}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', folder.relativePath);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('ring-2', 'ring-blue-500');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('ring-2', 'ring-blue-500');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-blue-500');
                const sourcePath = e.dataTransfer.getData('text/plain');
                if (sourcePath && sourcePath !== folder.relativePath) {
                  onDropOnFolder(sourcePath, folder.relativePath);
                }
              }}
              onClick={() => {
                setSelectedItem(folder);
                setIsPropertiesOpen(true);
              }}
              onDoubleClick={() => navigateTo(folder.relativePath)}
              onContextMenu={(e) => onContextMenu(e, folder)}
              className={`group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-zinc-800 ring-2 ring-blue-500/40'
                  : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform border border-transparent dark:border-zinc-700">
                  <Folder className="w-5 h-5 fill-blue-500/30" />
                </div>
                <div className="truncate">
                  <span className="text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate block">
                    {folder.name}
                  </span>
                </div>
              </div>

              {folder.hasShadowCopy && (
                <span title="Snapshots ZFS disponíveis">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
