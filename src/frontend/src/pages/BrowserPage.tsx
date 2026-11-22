import React, { useState, useRef, useEffect } from 'react';
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
import { MoveCopyModal } from '../components/modals/MoveCopyModal';
import { UnsupportedFileModal } from '../components/modals/UnsupportedFileModal';
import { ImageViewerModal } from '../components/viewers/ImageViewerModal';
import { VideoPlayerModal } from '../components/viewers/VideoPlayerModal';
import { PdfViewerModal } from '../components/viewers/PdfViewerModal';
import { CodeEditorModal } from '../components/viewers/CodeEditorModal';
import { MarkdownEditorModal } from '../components/viewers/MarkdownEditorModal';
import { FileItem } from '../types';
import appLogo from '../assets/logo.png';
import { useDataset } from '../context/DatasetContext';
import { useI18n } from '../context/I18nContext';
import { apiClient } from '../api/client';
import { AlertCircle, FolderX, Database, HardDrive, ShieldCheck, ArrowRight } from 'lucide-react';

export const BrowserPage: React.FC = () => {
  const {
    datasets,
    selectedDataset,
    selectDataset,
    currentPath,
    snapshotName,
    listing,
    isLoading,
    error,
    viewMode,
    selectedItem,
    setSelectedItem,
    refreshListing
  } = useDataset();
  const { t } = useI18n();

  // Modals state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [moveCopyTarget, setMoveCopyTarget] = useState<{ item: FileItem; mode: 'move' | 'copy' } | null>(null);

  // Viewers state
  const [viewingItem, setViewingItem] = useState<{ item: FileItem; snap?: string | null } | null>(null);

  // Hidden file input for upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem } | null>(null);

  const folders = listing?.items.filter(i => i.type === 'Directory') || [];
  const files = listing?.items.filter(i => i.type === 'File') || [];
  const mediaFiles = files.filter(f => f.category === 'Image' || f.category === 'Video');

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

  const handleDownload = (item: FileItem, snap?: string | null) => {
    if (!selectedDataset) return;
    const token = localStorage.getItem('csb_token') || '';
    let url = `/api/files/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(item.relativePath)}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    const effectiveSnap = snap !== undefined ? snap : snapshotName;
    if (effectiveSnap) url += `&snapshotName=${encodeURIComponent(effectiveSnap)}`;
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
    formData.append('directory', currentPath);

    for (let i = 0; i < uploadedFiles.length; i++) {
      formData.append('files', uploadedFiles[i]);
    }

    try {
      await apiClient.post('/files/upload', formData);
      refreshListing();
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(err?.response?.data?.message || 'Falha ao enviar arquivos.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Global keyboard shortcuts and Escape hierarchy:
  // Order of Escape:
  // 1. Any open action modal (Rename, Move/Copy, Delete, NewFolder) closes first.
  // 2. Active file viewer closes next.
  // 3. Context menu closes last.
  //
  // F2: Rename
  // F9: Download
  // Del: Delete with confirmation (listing only, not in inputs/viewers)
  // F8: Move
  // F7: Copy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Handle Escape key hierarchy
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        if (renameTarget !== null) {
          setRenameTarget(null);
          return;
        }
        if (moveCopyTarget !== null) {
          setMoveCopyTarget(null);
          return;
        }
        if (deleteTarget !== null) {
          setDeleteTarget(null);
          return;
        }
        if (isNewFolderOpen) {
          setIsNewFolderOpen(false);
          return;
        }
        if (viewingItem !== null) {
          setViewingItem(null);
          return;
        }
        if (contextMenu !== null) {
          setContextMenu(null);
          return;
        }
        return;
      }

      // 2. Don't intercept function keys if any action modal is currently open
      if (
        isNewFolderOpen ||
        renameTarget !== null ||
        deleteTarget !== null ||
        moveCopyTarget !== null
      ) {
        return;
      }

      // Determine target: active viewer file or currently selected listing item
      const targetItem = viewingItem ? viewingItem.item : selectedItem;
      if (!targetItem || !selectedDataset) return;

      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;

      // When in listing view (no file viewer active), don't intercept if focus is inside an input/textarea
      if (!viewingItem && isInput) {
        return;
      }

      const isReadOnly = selectedDataset.accessMode === 'ReadOnly' || !!(viewingItem?.snap || snapshotName);

      if (e.key === 'F2') {
        e.preventDefault();
        if (!isReadOnly) {
          setRenameTarget(targetItem);
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleDownload(targetItem, viewingItem?.snap);
      } else if (e.key === 'Delete') {
        // Delete is restricted to file listing and non-input elements
        if (!viewingItem && !isInput) {
          e.preventDefault();
          if (!isReadOnly) {
            setDeleteTarget(targetItem);
          }
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (!isReadOnly) {
          setMoveCopyTarget({ item: targetItem, mode: 'move' });
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        setMoveCopyTarget({ item: targetItem, mode: 'copy' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedItem,
    selectedDataset,
    snapshotName,
    isNewFolderOpen,
    renameTarget,
    deleteTarget,
    moveCopyTarget,
    viewingItem,
    contextMenu
  ]);

  const renderActiveViewer = () => {
    if (!viewingItem) return null;
    const { item, snap } = viewingItem;

    // Image or Video (supports < and > media navigation across images & videos)
    if (item.category === 'Image' || item.category === 'Video') {
      const mediaIndex = mediaFiles.findIndex(f => f.relativePath === item.relativePath);
      const hasPrev = mediaIndex > 0;
      const hasNext = mediaIndex !== -1 && mediaIndex < mediaFiles.length - 1;
      const onPrev = hasPrev ? () => setViewingItem({ item: mediaFiles[mediaIndex - 1], snap }) : undefined;
      const onNext = hasNext ? () => setViewingItem({ item: mediaFiles[mediaIndex + 1], snap }) : undefined;
      const currentIndex = mediaIndex !== -1 ? mediaIndex + 1 : undefined;
      const totalCount = mediaFiles.length;

      if (item.category === 'Image') {
        return (
          <ImageViewerModal
            item={item}
            snapshotName={snap}
            onClose={() => setViewingItem(null)}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            currentIndex={currentIndex}
            totalCount={totalCount}
          />
        );
      } else {
        return (
          <VideoPlayerModal
            item={item}
            snapshotName={snap}
            onClose={() => setViewingItem(null)}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            currentIndex={currentIndex}
            totalCount={totalCount}
          />
        );
      }
    }

    // Audio
    if (item.category === 'Audio') {
      return <VideoPlayerModal item={item} snapshotName={snap} onClose={() => setViewingItem(null)} />;
    }

    // PDF Documents
    if (item.category === 'Document' && item.extension.toLowerCase() === '.pdf') {
      return <PdfViewerModal item={item} snapshotName={snap} onClose={() => setViewingItem(null)} />;
    }

    // Markdown file (.md, .markdown)
    if (item.extension.toLowerCase() === '.md' || item.extension.toLowerCase() === '.markdown') {
      return <MarkdownEditorModal item={item} snapshotName={snap} onClose={() => setViewingItem(null)} />;
    }

    // Text & Code files
    if (item.category === 'Text' || item.category === 'Code') {
      return <CodeEditorModal item={item} snapshotName={snap} onClose={() => setViewingItem(null)} />;
    }

    // Incompatible / Unsupported files (programs .exe, archives .zip/.tar, binaries, etc.)
    return (
      <UnsupportedFileModal
        item={item}
        snapshotName={snap}
        onClose={() => setViewingItem(null)}
        onDownload={(i) => {
          if (!selectedDataset) return;
          let url = `/api/files/download?datasetId=${selectedDataset.id}&path=${encodeURIComponent(i.relativePath)}`;
          if (snap) url += `&snapshotName=${encodeURIComponent(snap)}`;
          else if (snapshotName) url += `&snapshotName=${encodeURIComponent(snapshotName)}`;
          window.open(url, '_blank');
        }}
      />
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      onClick={() => setContextMenu(null)}
      className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex flex-col font-sans transition-colors"
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
          const name = prompt(t('browser.namePromptNewText'));
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

        {/* Central Browsing Zone */}
        {!selectedDataset ? (
          /* Home Welcome Dashboard */
          <main className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-500/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight mb-2">
                    {t('browser.welcomeTitle')}
                  </h2>
                  <p className="text-sm text-blue-100 max-w-xl">
                    {t('browser.welcomeSubtitle')}
                  </p>
                </div>
                <div className="hidden sm:flex shrink-0 ml-6 p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                  <img src={appLogo} alt="Logo" className="w-16 h-16 object-contain drop-shadow" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-4 px-1">
                  {t('browser.availableDatasets')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {datasets.map((ds) => (
                    <div
                      key={ds.id}
                      onClick={() => selectDataset(ds)}
                      className="group p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                              <Database className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {ds.name}
                              </h4>
                              <p className="text-xs text-slate-400 dark:text-zinc-500">
                                {ds.accessMode === 'ReadOnly' ? `${t('common.readOnly')} (:ro)` : `${t('common.readWrite')} (:rw)`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {ds.hasShadowCopy && (
                              <span title={t('sidebar.zfsActive')} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                ZFS
                              </span>
                            )}
                            {ds.accessMode === 'ReadOnly' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                RO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Storage */}
                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                        <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400 mb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                            <span>{formatBytes(ds.usedBytes)} / {formatBytes(ds.totalBytes)}</span>
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{ds.usedPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, ds.usedPercentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        ) : (
          /* File Directory Browsing View */
          <DragAndDropZone>
            <main className="flex-1 overflow-y-auto px-8 py-5 flex flex-col justify-between">
              <div>
                {/* Top Bar inside central pane: Breadcrumbs and View Toggles */}
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
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
                  <div className="py-24 text-center text-slate-400 dark:text-zinc-500 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium">{t('browser.loadingDirectory')}</p>
                  </div>
                ) : listing?.items.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 dark:text-zinc-500 flex flex-col items-center justify-center space-y-2">
                    <FolderX className="w-12 h-12 text-slate-300 dark:text-zinc-700 stroke-1" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300">{t('browser.emptyFolder')}</p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500">{t('browser.emptyFolderHint')}</p>
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
        )}

        {/* Right Properties Sidebar - ALWAYS VISIBLE */}
        <PropertiesSidebar
          item={selectedItem}
          onPreviewSnapshot={handlePreviewSnapshot}
          onOpenFile={handleOpenFile}
        />
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
          onCopy={(i) => setMoveCopyTarget({ item: i, mode: 'copy' })}
          onMove={(i) => setMoveCopyTarget({ item: i, mode: 'move' })}
          onShowProperties={() => {
            setSelectedItem(contextMenu.item);
          }}
        />
      )}

      {/* Viewers */}
      {renderActiveViewer()}

      {/* Modals */}
      {isNewFolderOpen && <NewFolderModal onClose={() => setIsNewFolderOpen(false)} />}
      {renameTarget && (
        <RenameModal
          item={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRenamed={(newName, newRelativePath) => {
            if (viewingItem && viewingItem.item.relativePath === renameTarget.relativePath) {
              setViewingItem(prev => prev ? {
                ...prev,
                item: {
                  ...prev.item,
                  name: newName,
                  relativePath: newRelativePath
                }
              } : null);
            }
            if (selectedItem && selectedItem.relativePath === renameTarget.relativePath) {
              setSelectedItem({
                ...selectedItem,
                name: newName,
                relativePath: newRelativePath
              });
            }
          }}
        />
      )}
      {deleteTarget && <DeleteModal item={deleteTarget} onClose={() => setDeleteTarget(null)} />}
      {moveCopyTarget && (
        <MoveCopyModal
          item={moveCopyTarget.item}
          mode={moveCopyTarget.mode}
          onClose={() => setMoveCopyTarget(null)}
          onSuccess={() => {
            if (moveCopyTarget.mode === 'move' && viewingItem?.item.relativePath === moveCopyTarget.item.relativePath) {
              setViewingItem(null);
            }
            refreshListing();
          }}
        />
      )}
    </div>
  );
};
