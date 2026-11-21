import React, { useState, useRef } from 'react';
import { Header } from '../components/layout/Header';
import { SidebarLeft } from '../components/layout/SidebarLeft';
import { PropertiesSidebar } from '../components/layout/PropertiesSidebar';
import { SnapshotBanner } from '../components/layout/SnapshotBanner';
import { Breadcrumbs } from '../components/files/Breadcrumbs';
import { ViewModeToggle } from '../components/files/ViewModeToggle';
import { FolderCards } from '../components/files/FolderCards';
import { FileGrid } from '../components/files/FileGrid';
import { FileTable } from '../components/files/FileTable';
import { Pagination } from '../components/files/Pagination';
import { ContextMenu } from '../components/files/ContextMenu';
import { DragAndDropZone } from '../components/files/DragAndDropZone';
import { NewFolderModal } from '../components/modals/NewFolderModal';
import { RenameModal } from '../components/modals/RenameModal';
import { DeleteModal } from '../components/modals/DeleteModal';
import { ImageViewerModal } from '../components/viewers/ImageViewerModal';
import { VideoPlayerModal } from '../components/viewers/VideoPlayerModal';
import { PdfViewerModal } from '../components/viewers/PdfViewerModal';
import { CodeEditorModal } from '../components/viewers/CodeEditorModal';
import { FileItem } from '../types';
import { useDataset } from '../context/DatasetContext';
import { apiClient } from '../api/client';
import { AlertCircle, FolderX } from 'lucide-react';

export const BrowserPage: React.FC = () => {
  const {
    listing,
    isLoading,
    error,
    viewMode,
    selectedItem,
    setSelectedItem,
    isPropertiesOpen,
    setIsPropertiesOpen,
    selectedDataset,
    currentPath,
    snapshotName,
    refreshListing
  } = useDataset();

  // Modals state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);

  // Viewers state
  const [viewingItem, setViewingItem] = useState<{ item: FileItem; snap?: string | null } | null>(null);

  // Hidden file input for upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem } | null>(null);

  const folders = listing?.items.filter(i => i.type === 'Directory') || [];
  const files = listing?.items.filter(i => i.type === 'File') || [];

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleOpenFile = (item: FileItem) => {
    setViewingItem({ item, snap: snapshotName });
  };

  const handlePreviewSnapshot = (snapName: string) => {
    if (selectedItem) {
      setViewingItem({ item: selectedItem, snap: snapName });
    }
  };

  const handleDownload = (item: FileItem) => {
    if (!selectedDataset) return;
    let url = `/api/files/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
    if (snapshotName) url += `&snapshotName=${encodeURIComponent(snapshotName)}`;
    window.open(url, '_blank');
  };

  const handleDropOnFolder = async (sourcePath: string, targetFolderPath: string) => {
    if (!selectedDataset) return;
    try {
      await apiClient.post('/files/move', {
        datasetId: selectedDataset.id,
        sourcePath,
        targetDirectory: targetFolderPath
      });
      refreshListing();
    } catch (err) {
      console.error('Failed to move item', err);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !selectedDataset) return;

    const formData = new FormData();
    formData.append('datasetId', selectedDataset.id.toString());
    formData.append('targetPath', currentPath);

    Array.from(uploadedFiles).forEach(f => {
      formData.append('files', f);
    });

    try {
      await apiClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      refreshListing();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderActiveViewer = () => {
    if (!viewingItem) return null;
    const { item, snap } = viewingItem;

    if (item.category === 'Image') {
      return <ImageViewerModal item={item} snapshotName={snap} onClose={() => setViewingItem(null)} />;
    }
    if (item.category === 'Video' || item.category === 'Audio') {
      return <VideoPlayerModal item={item} snapshotName={snap} onClose={() => setViewingItem(null)} />;
    }
    if (item.category === 'Document' && item.extension === '.pdf') {
      return <PdfViewerModal item={item} snapshotName={snap} onClose={() => setViewingItem(null)} />;
    }
    // Text / Code viewer
    return <CodeEditorModal item={item} snapshotName={snap} onClose={() => setViewingItem(null)} />;
  };

  return (
    <div
      onClick={() => setContextMenu(null)}
      className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <Header
        onNewFolder={() => setIsNewFolderOpen(true)}
        onUploadClick={() => fileInputRef.current?.click()}
        onNewTextFile={() => {
          // Open new file creation modal or prompt
          const name = prompt('Nome do novo arquivo de texto (ex: notas.txt):');
          if (name && selectedDataset) {
            const rel = currentPath ? `${currentPath}/${name}` : name;
            apiClient.put('/files/content', {
              datasetId: selectedDataset.id,
              relativePath: rel,
              content: ''
            }).then(() => refreshListing());
          }
        }}
      />

      <SnapshotBanner />

      <div className="flex-1 flex overflow-hidden">
        <SidebarLeft />

        {/* Central Browsing Zone with Drag and Drop */}
        <DragAndDropZone>
          <main className="flex-1 overflow-y-auto px-8 py-5 flex flex-col justify-between">
            <div>
              {/* Top Bar inside central pane: Breadcrumbs and View Toggles */}
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <Breadcrumbs />
                <ViewModeToggle />
              </div>

              {/* Main Content States */}
              {error ? (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm rounded-2xl flex items-center space-x-3 max-w-xl mx-auto my-12">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : isLoading ? (
                <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium">Carregando diretório...</p>
                </div>
              ) : listing?.items.length === 0 ? (
                <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <FolderX className="w-12 h-12 text-slate-300 dark:text-slate-700 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Esta pasta está vazia</p>
                  <p className="text-xs text-slate-400">Arraste arquivos ou clique em "+ Novo" para adicionar</p>
                </div>
              ) : (
                <>
                  {viewMode === 'Thumbnails' ? (
                    <div>
                      <FolderCards
                        folders={folders}
                        onContextMenu={handleContextMenu}
                        onDropOnFolder={handleDropOnFolder}
                      />
                      <FileGrid
                        files={files}
                        onContextMenu={handleContextMenu}
                        onOpenFile={handleOpenFile}
                      />
                    </div>
                  ) : (
                    <FileTable
                      items={listing?.items || []}
                      onContextMenu={handleContextMenu}
                      onOpenFile={handleOpenFile}
                    />
                  )}
                </>
              )}
            </div>

            {/* Pagination at bottom */}
            <div className="mt-8">
              <Pagination />
            </div>
          </main>
        </DragAndDropZone>

        {/* Right Properties Sidebar */}
        {isPropertiesOpen && selectedItem && (
          <PropertiesSidebar
            item={selectedItem}
            onClose={() => setIsPropertiesOpen(false)}
            onPreviewSnapshot={handlePreviewSnapshot}
          />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onOpen={handleOpenFile}
          onDownload={handleDownload}
          onRename={(i) => setRenameTarget(i)}
          onDelete={(i) => setDeleteTarget(i)}
          onCopy={async (i) => {
            if (!selectedDataset) return;
            const dest = prompt('Copiar para diretório relativo:', currentPath);
            if (dest !== null) {
              await apiClient.post('/files/copy', {
                datasetId: selectedDataset.id,
                sourcePath: i.relativePath,
                targetDirectory: dest
              });
              refreshListing();
            }
          }}
          onMove={async (i) => {
            if (!selectedDataset) return;
            const dest = prompt('Mover para diretório relativo:', currentPath);
            if (dest !== null) {
              await apiClient.post('/files/move', {
                datasetId: selectedDataset.id,
                sourcePath: i.relativePath,
                targetDirectory: dest
              });
              refreshListing();
            }
          }}
          onShowProperties={() => setIsPropertiesOpen(true)}
        />
      )}

      {/* Modals */}
      {isNewFolderOpen && <NewFolderModal onClose={() => setIsNewFolderOpen(false)} />}
      {renameTarget && <RenameModal item={renameTarget} onClose={() => setRenameTarget(null)} />}
      {deleteTarget && <DeleteModal item={deleteTarget} onClose={() => setDeleteTarget(null)} />}

      {/* Viewers */}
      {renderActiveViewer()}
    </div>
  );
};
