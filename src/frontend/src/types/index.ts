export type DatasetAccessMode = 'ReadOnly' | 'ReadWrite';

export type ItemType = 'File' | 'Directory';

export type ViewMode = 'Thumbnails' | 'List' | 'Details';

export type FileCategory =
  | 'Image'
  | 'Video'
  | 'Audio'
  | 'Document'
  | 'Archive'
  | 'Code'
  | 'Text'
  | 'Other';

export type SortField = 'Name' | 'Size' | 'LastModified' | 'Extension';
export type SortDirection = 'Ascending' | 'Descending';

export type SnapshotChangeStatus = 'Modified' | 'Unchanged' | 'Added' | 'Deleted';

export interface User {
  id: number;
  username: string;
  role: 'Admin' | 'User';
  lastLoginAtUtc?: string;
}

export interface LoginResponse {
  token: string;
  expiresInDays: number;
  user: User;
}

export interface Dataset {
  id: number;
  name: string;
  path: string;
  accessMode: DatasetAccessMode;
  description?: string;
  hasShadowCopy: boolean;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercentage: number;
}

export interface FileItem {
  name: string;
  relativePath: string;
  type: ItemType;
  size: number;
  createdAtUtc: string;
  lastModifiedAtUtc: string;
  extension: string;
  category: FileCategory;
  isReadOnly: boolean;
  hasShadowCopy: boolean;
  hasThumbnail: boolean;
}

export interface DirectoryListing {
  currentPath: string;
  snapshotName?: string;
  isReadOnly: boolean;
  hasShadowCopy: boolean;
  showHidden: boolean;
  items: FileItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SnapshotVersion {
  snapshotName: string;
  timestamp: string;
  relativePath: string;
  type: ItemType;
  size: number;
  lastModifiedAtUtc: string;
  changeStatus: SnapshotChangeStatus;
  formattedDate: string;
}

export interface MediaMetadata {
  format?: string;
  duration?: string;
  overallBitrate?: number;

  // Image Specifics
  width?: number;
  height?: number;
  aspectRatio?: string;
  colorType?: string;
  bitsPerPixel?: number;
  colorCount?: number;
  colorSpace?: string;

  // Exif / Camera Specifics (Images)
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  fNumber?: string;
  exposureTime?: string;
  isoSpeed?: string;
  dateTaken?: string;
  software?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;

  // Audio Specifics
  audioCodec?: string;
  audioBitrate?: number;
  audioSampleRate?: number;
  audioChannels?: number;
  audioChannelLayout?: string;
  audioBitrateMode?: string; // "CBR" | "VBR"

  // Video Specifics
  videoCodec?: string;
  videoProfile?: string;
  videoBitrate?: number;
  frameRate?: number;
  pixelFormat?: string;
}
