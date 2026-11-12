import { FileSortConfig } from '../models/file-sort';

export const DEFAULT_FILE_SORT_CONFIG: FileSortConfig = {
  field: 'name',
  direction: 'asc',
  directoriesFirst: true,
};
