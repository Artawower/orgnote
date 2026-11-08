import type { ValidationState } from './file-guard';
import type { BufferScheme } from './buffer-uri';

type BufferError = string;

export interface BufferMetadata<T = unknown> {
  [key: string]: T;
}

export interface BufferGuard {
  readonly: boolean;
  reason?: string;
  validation?: ValidationState;
}

export interface Buffer<T = unknown> {
  uri: string;
  scheme: BufferScheme;
  path: string;
  title: string;

  rawContent: Uint8Array;

  readonly text: string;
  readonly base64: string;
  setText: (value: string) => void;

  isSaving: boolean;
  isLoading: boolean;
  encryptionStatus?: boolean;
  errors: BufferError[];

  lastAccessed: Date;
  referenceCount: number;

  metadata: BufferMetadata<T>;

  guard?: BufferGuard;
}
