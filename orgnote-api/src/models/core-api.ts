import type { DiskFile } from './file-system';

export type OrgNoteFileEncoding = 'utf8' | 'binary';
export type OrgNoteFilePath = string | readonly string[];

export interface OrgNoteFileSystemApi {
  readFile<TEncoding extends OrgNoteFileEncoding = 'utf8'>(
    path: OrgNoteFilePath,
    encoding?: TEncoding
  ): Promise<
    (TEncoding extends 'utf8' ? string : Uint8Array) | undefined
  >;

  writeFile(
    path: OrgNoteFilePath,
    content: string | Uint8Array
  ): Promise<void>;

  readDir(path?: OrgNoteFilePath): Promise<readonly DiskFile[]>;
  fileInfo(path: OrgNoteFilePath): Promise<DiskFile | undefined>;
}

export interface OrgNoteLogFields {
  readonly [key: string]: OrgNoteLogValue;
}

export type OrgNoteLogValue =
  | string
  | number
  | boolean
  | null
  | readonly OrgNoteLogValue[]
  | OrgNoteLogFields;

export interface OrgNoteLoggerApi {
  info(message: string, fields?: OrgNoteLogFields): void;
  error(message: string, fields?: OrgNoteLogFields): void;
  warn(message: string, fields?: OrgNoteLogFields): void;
  debug(message: string, fields?: OrgNoteLogFields): void;
}
