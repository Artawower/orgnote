import {
  SyncParams,
  Changes,
  StoredNoteInfo,
  NoteChanges,
  FileScanParams,
  FileSystem,
  NoteChange,
} from 'src/models';
import { getStringPath } from './get-string-path';
import { isOrgFile } from './is-org-file';
import { join } from './join-path';

export async function findNoteFilesDiff({
  fileInfo,
  readDir,
  lastSync,
  storedNotesInfo,
  dirPath,
}: SyncParams): Promise<NoteChanges> {
  const orgFilePaths = await readOrgFilesRecursively({
    fileInfo,
    readDir,
    dirPath,
  });

  const filesFromLastSync = await getOrgFilesFromLastSync(
    orgFilePaths,
    fileInfo,
    lastSync
  );

  const deleted = findDeletedNotes(orgFilePaths, storedNotesInfo);

  const [created, updated] = await findUpdatedCreatedNotes(
    fileInfo,
    filesFromLastSync,
    storedNotesInfo
  );

  return {
    deleted,
    created,
    updated,
  };
}

export async function getOrgFilesFromLastSync(
  filePaths: string[],
  fileInfo: FileSystem['fileInfo'],
  lastSync?: Date
): Promise<string[]> {
  if (!lastSync) {
    return filePaths;
  }

  const results = await Promise.all(
    filePaths.map(async (filePath) => {
      const stats = await fileInfo(filePath);
      const isModified =
        new Date(stats.mtime) > lastSync || new Date(stats.ctime) > lastSync;
      return isModified ? filePath : null;
    })
  );

  return results.filter((p): p is string => p !== null);
}

function findDeletedNotes(
  filePaths: string[],
  storedNotesInfo: StoredNoteInfo[]
): NoteChange[] {
  const uniqueFilePaths = new Set(filePaths);

  return storedNotesInfo.reduce((acc, storedNote) => {
    const storedNotePath = getStringPath(storedNote.filePath);
    if (uniqueFilePaths.has(storedNotePath)) {
      return acc;
    }
    acc.push({
      filePath: storedNotePath,
      id: storedNote.id,
    });
    return acc;
  }, []);
}

async function findUpdatedCreatedNotes(
  fileInfo: FileSystem['fileInfo'],
  orgFilePaths: string[],
  storedNotesInfo: StoredNoteInfo[]
): Promise<[NoteChange[], NoteChange[]]> {
  const created: NoteChange[] = [];
  const updated: NoteChange[] = [];

  const storedNotesInfoMap = getStoredNotesInfoMap(storedNotesInfo);

  for (const f of orgFilePaths) {
    const found = storedNotesInfoMap[f];
    if (!found) {
      created.push({ filePath: f });
      continue;
    }
    const fileUpdatedTime = new Date((await fileInfo(f))?.mtime);
    const storedUpdatedTime = new Date(found.updatedAt);
    if (storedUpdatedTime < fileUpdatedTime) {
      updated.push({ filePath: f });
    }
  }

  return [created, updated];
}

function getStoredNotesInfoMap(storedNotesInfo: StoredNoteInfo[]): {
  [key: string]: StoredNoteInfo;
} {
  return storedNotesInfo.reduce((acc, n) => {
    acc[getStringPath(n.filePath)] = n;
    return acc;
  }, {});
}

export async function readOrgFilesRecursively({
  fileInfo,
  readDir,
  dirPath,
}: FileScanParams): Promise<string[]> {
  const files = await readDir(dirPath);

  const collectedPaths: string[] = [];
  const getFullPath = (p: string) => join(dirPath, p);

  for (const f of files) {
    if (f.type === 'directory') {
      const subDirFiles = await readOrgFilesRecursively({
        fileInfo,
        readDir,
        dirPath: getFullPath(f.name),
      });

      collectedPaths.push(...subDirFiles);
      continue;
    }

    if (!isOrgFile(f.name)) {
      continue;
    }

    const fullFilePath = getFullPath(f.name);
    collectedPaths.push(fullFilePath);
  }

  return collectedPaths;
}

export function findFilesDiff(
  filePaths: string[],
  storedNotesInfo: StoredNoteInfo[],
  updatedTimeGetter: (filePath: string) => Date
): Changes {
  const existingFilePaths = new Set<string>(filePaths);

  const storedNotesPathSet = new Set<string>(
    storedNotesInfo.map((n) => getStringPath(n.filePath))
  );
  const changedFiles: Changes = { deleted: [], created: [], updated: [] };

  storedNotesInfo.forEach((storedNote) => {
    const fullPath = getStringPath(storedNote.filePath);
    if (!existingFilePaths.has(fullPath)) {
      changedFiles.deleted.push(fullPath);
      return;
    }

    const updatedTime = updatedTimeGetter(fullPath);
    if (updatedTime > new Date(storedNote.updatedAt)) {
      changedFiles.updated.push(fullPath);
    }
  });

  filePaths.forEach((filePath) => {
    if (!storedNotesPathSet.has(filePath)) {
      changedFiles.created.push(filePath);
      return;
    }
  });

  return changedFiles;
}
