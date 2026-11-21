import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dataset, FileItem, DirectoryListing, ViewMode, SortField, SortDirection } from '../types';
import { apiClient } from '../api/client';

interface DatasetContextType {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  selectDataset: (dataset: Dataset) => void;
  currentPath: string;
  navigateTo: (path: string) => void;
  snapshotName: string | null;
  setSnapshotName: (snap: string | null) => void;
  listing: DirectoryListing | null;
  isLoading: boolean;
  error: string | null;
  refreshListing: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  sortBy: SortField;
  setSortBy: (field: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedItem: FileItem | null;
  setSelectedItem: (item: FileItem | null) => void;
  isPropertiesOpen: boolean;
  setIsPropertiesOpen: (open: boolean) => void;
}

const DatasetContext = createContext<DatasetContextType>({} as DatasetContextType);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [snapshotName, setSnapshotName] = useState<string | null>(null);
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('Thumbnails');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sortBy, setSortBy] = useState<SortField>('Name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('Ascending');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);

  // Check query params on mount for snapshot navigation e.g. from "Abrir em nova aba"
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const snap = params.get('snapshot');
    const path = params.get('path');
    const dsId = params.get('dataset');

    if (snap) setSnapshotName(snap);
    if (path) setCurrentPath(path);

    loadDatasets(dsId ? parseInt(dsId, 10) : undefined);
  }, []);

  const loadDatasets = async (initialDatasetId?: number) => {
    try {
      const res = await apiClient.get<Dataset[]>('/datasets');
      setDatasets(res.data);
      if (res.data.length > 0) {
        if (initialDatasetId) {
          const matched = res.data.find(d => d.id === initialDatasetId);
          setSelectedDataset(matched || res.data[0]);
        } else {
          setSelectedDataset(res.data[0]);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao carregar datasets');
    }
  };

  const fetchListing = useCallback(async () => {
    if (!selectedDataset) return;

    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        datasetId: selectedDataset.id,
        path: currentPath,
        page,
        pageSize,
        sortBy,
        sortDirection
      };

      if (searchQuery) params.search = searchQuery;
      if (snapshotName) params.snapshotName = snapshotName;

      const res = await apiClient.get<DirectoryListing>('/files/browse', { params });
      setListing(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao listar arquivos');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataset, currentPath, page, pageSize, sortBy, sortDirection, searchQuery, snapshotName]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const selectDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setCurrentPath('');
    setSnapshotName(null);
    setPage(1);
    setSelectedItem(null);
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setPage(1);
    setSelectedItem(null);
  };

  const refreshListing = () => {
    fetchListing();
  };

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        selectedDataset,
        selectDataset,
        currentPath,
        navigateTo,
        snapshotName,
        setSnapshotName,
        listing,
        isLoading,
        error,
        refreshListing,
        viewMode,
        setViewMode,
        page,
        setPage,
        pageSize,
        setPageSize,
        sortBy,
        setSortBy,
        sortDirection,
        setSortDirection,
        searchQuery,
        setSearchQuery,
        selectedItem,
        setSelectedItem,
        isPropertiesOpen,
        setIsPropertiesOpen
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => useContext(DatasetContext);
