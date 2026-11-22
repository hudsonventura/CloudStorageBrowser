import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useDataset } from '../../context/DatasetContext';

interface DragAndDropZoneProps {
  children: React.ReactNode;
}

export const DragAndDropZone: React.FC<DragAndDropZoneProps> = ({ children }) => {
  const { selectedDataset, currentPath, snapshotName, refreshListing } = useDataset();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isReadOnly = selectedDataset?.accessMode === 'ReadOnly' || !!snapshotName;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isReadOnly && e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only unset if leaving window
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    if (isReadOnly || !selectedDataset) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('datasetId', selectedDataset.id.toString());
    formData.append('targetPath', currentPath);
    formData.append('directory', currentPath);

    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      await apiClient.post('/files/upload', formData);
      refreshListing();
    } catch (err: any) {
      console.error('Upload failed', err);
      alert(err?.response?.data?.message || 'Falha ao enviar arquivos.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 flex flex-col min-h-0"
    >
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-blue-600/10 backdrop-blur-xs border-4 border-dashed border-blue-500 rounded-3xl m-4 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 pointer-events-none animate-in fade-in">
          <UploadCloud className="w-16 h-16 mb-2 animate-bounce" />
          <p className="font-bold text-lg">Solte os arquivos aqui para fazer upload</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Serão enviados para a pasta atual</p>
        </div>
      )}

      {isUploading && (
        <div className="absolute bottom-6 right-6 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-200 animate-in slide-in-from-bottom">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Enviando arquivos...</span>
        </div>
      )}

      {children}
    </div>
  );
};
