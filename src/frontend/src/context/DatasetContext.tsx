import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  showHidden: boolean;
  setShowHidden: (val: boolean) => void;
  refreshDatasets: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType>({} as DatasetContextType);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [snapshotName, setSnapshotNameState] = useState<string | null>(null);
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
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [showHidden, setShowHiddenState] = useState<boolean>(() => localStorage.getItem('csb_show_hidden') === 'true');

  const setShowHidden = (val: boolean) => {
    setShowHiddenState(val);
    localStorage.setItem('csb_show_hidden', val ? 'true' : 'false');
  };

  // Load datasets on mount
  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const res = await apiClient.get<Dataset[]>('/datasets');
      setDatasets(res.data);
      setSelectedDataset(prev => {
        if (!prev) return null;
        const stillExists = res.data.some(d => d.id === prev.id);
        if (!stillExists) {
          navigate('/home');
          return null;
        }
        return prev;
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao carregar datasets');
    }
  };

  // Synchronize state with URL pathname & search params
  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const searchParams = new URLSearchParams(location.search);
    const snap = searchParams.get('snapshot') || null;
    setSnapshotNameState(snap);

    if (segments.length === 0 || segments[0] === 'home' || segments[0] === 'login') {
      setSelectedDataset(null);
      setCurrentPath('');
      setSelectedItem(null);
      return;
    }

    const dsNameFromUrl = decodeURIComponent(segments[0]);
    const subPathFromUrl = segments.slice(1).map(decodeURIComponent).join('/');

    if (datasets.length > 0) {
      const matched = datasets.find(d => d.name.toLowerCase() === dsNameFromUrl.toLowerCase());
      if (matched) {
        setSelectedDataset(prev => (prev?.id === matched.id ? prev : matched));
        setCurrentPath(subPathFromUrl);
      } else {
        setError(`Dataset "${dsNameFromUrl}" não encontrado.`);
      }
    }
  }, [location.pathname, location.search, datasets]);

  const selectDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setCurrentPath('');
    setSnapshotNameState(null);
    setPage(1);
    setSelectedItem(null);
    navigate(`/${encodeURIComponent(dataset.name)}`);
  };

  const navigateTo = (path: string) => {
    if (!selectedDataset) return;
    setCurrentPath(path);
    setPage(1);
    setSelectedItem(null);

    const encodedDataset = encodeURIComponent(selectedDataset.name);
    const pathPart = path ? `/${path.split('/').map(encodeURIComponent).join('/')}` : '';
    const searchPart = snapshotName ? `?snapshot=${encodeURIComponent(snapshotName)}` : '';
    navigate(`/${encodedDataset}${pathPart}${searchPart}`);
  };

  const setSnapshotName = (snap: string | null) => {
    setSnapshotNameState(snap);
    if (!selectedDataset) return;

    const encodedDataset = encodeURIComponent(selectedDataset.name);
    const pathPart = currentPath ? `/${currentPath.split('/').map(encodeURIComponent).join('/')}` : '';
    const searchPart = snap ? `?snapshot=${encodeURIComponent(snap)}` : '';
    navigate(`/${encodedDataset}${pathPart}${searchPart}`);
  };

  const fetchListing = useCallback(async () => {
    if (!selectedDataset) {
      setListing(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        datasetId: selectedDataset.id,
        path: currentPath,
        page,
        pageSize,
        sortBy,
        sortDirection,
        showHidden
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
  }, [selectedDataset, currentPath, page, pageSize, sortBy, sortDirection, searchQuery, snapshotName, showHidden]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

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
        setIsPropertiesOpen,
        showHidden,
        setShowHidden,
        refreshDatasets: loadDatasets
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => useContext(DatasetContext);
