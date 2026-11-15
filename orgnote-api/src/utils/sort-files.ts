import { DiskFile } from '../models/file-system';
import { FileSortConfig, FileSortField } from '../models/file-sort';

const DIRECTORY_TYPE = 'directory';

const fieldAccessors: Record<FileSortField, (f: DiskFile) => string | number> = {
  name: (f) => f.name.toLowerCase(),
  mtime: (f) => f.mtime,
  size: (f) => f.size,
};

const compareValues = (a: string | number, b: string | number): number => {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return (a as number) - (b as number);
};

const compareByField = (a: DiskFile, b: DiskFile, config: FileSortConfig): number => {
  const accessor = fieldAccessors[config.field];
  const result = compareValues(accessor(a), accessor(b));
  return config.direction === 'asc' ? result : -result;
};

const compareWithDirectoriesFirst = (a: DiskFile, b: DiskFile, config: FileSortConfig): number => {
  if (!config.directoriesFirst) return compareByField(a, b, config);

  const aIsDir = a.type === DIRECTORY_TYPE;
  const bIsDir = b.type === DIRECTORY_TYPE;
  if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
  return compareByField(a, b, config);
};

export const sortFiles = (files: readonly DiskFile[], config: FileSortConfig): DiskFile[] =>
  [...files].sort((a, b) => compareWithDirectoriesFirst(a, b, config));
