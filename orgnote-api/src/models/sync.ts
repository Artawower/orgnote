import { FileSystem } from './file-system';

export interface Changes {
  deleted: string[];
  created: string[];
  updated: string[];
}

export interface NoteChange {
  filePath: string;
  id?: string;
}

export interface NoteChanges {
  deleted: NoteChange[];
  created: NoteChange[];
  updated: NoteChange[];
}

export interface StoredNoteInfo {
  filePath: string[];
  id: string;
  updatedAt: string | Date;
}

export interface FileScanParams {
  readDir: FileSystem['readDir'];
  fileInfo: FileSystem['fileInfo'];
  dirPath: string;
}

export interface SyncParams extends FileScanParams {
  storedNotesInfo: StoredNoteInfo[];
  /* Will be used instead of updated time from the storedNoteInfo property */
  lastSync?: Date;
}
