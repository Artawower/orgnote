import type {
  DiskFile,
  OrgNoteFileEncoding,
  OrgNoteFilePath,
} from 'orgnote-api';
import { isRecord } from './protocol-validation';

export const CORE_RPC_OPERATION = {
  READ_FILE: 'files.readFile',
  WRITE_FILE: 'files.writeFile',
  READ_DIR: 'files.readDir',
  FILE_INFO: 'files.fileInfo',
} as const;

export type CoreRpcOperation =
  (typeof CORE_RPC_OPERATION)[keyof typeof CORE_RPC_OPERATION];

export interface ReadFileInput {
  readonly path: OrgNoteFilePath;
  readonly encoding?: OrgNoteFileEncoding;
}

export interface WriteFileInput {
  readonly path: OrgNoteFilePath;
  readonly content: string | Uint8Array;
}

export interface ReadDirInput {
  readonly path?: OrgNoteFilePath;
}

export interface FileInfoInput {
  readonly path: OrgNoteFilePath;
}

interface CoreRpcProcedure<TInput, TOutput> {
  readonly input: TInput;
  readonly output: TOutput;
}

export interface CoreRpcContract {
  readonly [CORE_RPC_OPERATION.READ_FILE]: CoreRpcProcedure<
    ReadFileInput,
    string | Uint8Array | undefined
  >;
  readonly [CORE_RPC_OPERATION.WRITE_FILE]: CoreRpcProcedure<WriteFileInput, void>;
  readonly [CORE_RPC_OPERATION.READ_DIR]: CoreRpcProcedure<ReadDirInput, readonly DiskFile[]>;
  readonly [CORE_RPC_OPERATION.FILE_INFO]: CoreRpcProcedure<FileInfoInput, DiskFile | undefined>;
}

export type CoreRpcInput<TOperation extends CoreRpcOperation> =
  CoreRpcContract[TOperation]['input'];

export type CoreRpcOutput<TOperation extends CoreRpcOperation> =
  CoreRpcContract[TOperation]['output'];

export type CoreRpcRequest = {
  readonly [TOperation in CoreRpcOperation]: {
    readonly operation: TOperation;
    readonly input: CoreRpcInput<TOperation>;
  };
}[CoreRpcOperation];

const isPath = (value: unknown): value is OrgNoteFilePath =>
  typeof value === 'string' || (
    Array.isArray(value) && value.every((part) => typeof part === 'string')
  );

const isEncoding = (value: unknown): value is OrgNoteFileEncoding | undefined =>
  value === undefined || value === 'utf8' || value === 'binary';

const isReadFileInput = (value: unknown): value is ReadFileInput =>
  isRecord(value) && isPath(value.path) && isEncoding(value.encoding);

const isWriteFileInput = (value: unknown): value is WriteFileInput =>
  isRecord(value) &&
  isPath(value.path) &&
  (typeof value.content === 'string' || value.content instanceof Uint8Array);

const isReadDirInput = (value: unknown): value is ReadDirInput =>
  isRecord(value) && (value.path === undefined || isPath(value.path));

const isFileInfoInput = (value: unknown): value is FileInfoInput =>
  isRecord(value) && isPath(value.path);

export const isCoreRpcRequest = (value: unknown): value is CoreRpcRequest => {
  if (!isRecord(value)) return false;
  if (value.operation === CORE_RPC_OPERATION.READ_FILE) return isReadFileInput(value.input);
  if (value.operation === CORE_RPC_OPERATION.WRITE_FILE) return isWriteFileInput(value.input);
  if (value.operation === CORE_RPC_OPERATION.READ_DIR) return isReadDirInput(value.input);
  if (value.operation === CORE_RPC_OPERATION.FILE_INFO) return isFileInfoInput(value.input);
  return false;
};
