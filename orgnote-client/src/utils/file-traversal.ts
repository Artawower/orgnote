export interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}

export interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void
  ) => void;
}

export interface FileSystemDirectoryEntry extends FileSystemEntry {
  createReader: () => FileSystemDirectoryReader;
}

export interface FileSystemFileEntry extends FileSystemEntry {
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (error: DOMException) => void
  ) => void;
}

const IGNORE_DIRS = ['.git', 'node_modules', 'dist', 'build'];

export const traverseDirectory = (
  entry: FileSystemDirectoryEntry,
  accept: string[] = [],
): Promise<FileSystemFileEntry[]> => {
  const reader = entry.createReader();

  return new Promise((resolve, reject) => {
    const iterationAttempts: Promise<FileSystemFileEntry[]>[] = [];

    const readEntries = () => {
      reader.readEntries(
        (entries) => {
          if (!entries.length) {
            resolve(
              Promise.all(iterationAttempts).then((entries) => entries.flat(2))
            );
            return;
          }

          iterationAttempts.push(
            Promise.all(
              entries.map((ientry) => {
                const fileExt = ientry.name.split('.').pop();
                if (ientry.isFile && (!accept.length || accept.includes(fileExt ?? ''))) {
                  return ientry as unknown as FileSystemFileEntry;
                }
                if (ientry.isFile || IGNORE_DIRS.includes(ientry.name)) {
                  return [];
                }
                return traverseDirectory(
                  ientry as unknown as FileSystemDirectoryEntry,
                  accept,
                );
              })
            ) as Promise<FileSystemFileEntry[]>
          );
          readEntries();
        },
        (error) => reject(error)
      );
    };

    readEntries();
  });
};

export const extractFiles = async (
  items: DataTransferItemList | undefined,
  accept: string[] = []
): Promise<FileSystemFileEntry[]> => {
  if (!items) return [];

  const files: FileSystemFileEntry[] = [];

  for (const item of Array.from(items)) {
    const entry = item.webkitGetAsEntry();
    if (!entry) continue;

    if (entry.isFile) {
      const fileExt = entry.name.split('.').pop();
      if (!accept.length || accept.includes(fileExt ?? '')) {
        files.push(entry as unknown as FileSystemFileEntry);
      }
    } else if (entry.isDirectory) {
      files.push(...(await traverseDirectory(entry as unknown as FileSystemDirectoryEntry, accept)));
    }
  }

  return files;
};

export const readFile = (fileEntry: FileSystemFileEntry): Promise<File> => {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
};
