import { SortDirection } from './sort-direction';
import { DiskFile } from './file-system';

export type FileSortField = keyof Pick<DiskFile, 'name' | 'mtime' | 'size'>;

export interface FileSortConfig {
  readonly field: FileSortField;
  readonly direction: SortDirection;
  readonly directoriesFirst: boolean;
}

