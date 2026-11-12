import type { DiskFile } from './file-system';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationError {
  message: string;
  severity: ValidationSeverity;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export type FileValidatorFn = (
  content: string | Uint8Array
) => Promise<ValidationError[]>;

export type FileMatcherFn = (path: string, file?: DiskFile) => boolean;

export type FilePolicySource = 'system' | 'user' | 'extension';

export interface FileGuard {
  id: string;
  matcher: FileMatcherFn;
  validator?: FileValidatorFn;
  readonly?: boolean;
  reason?: string;
  source?: FilePolicySource;
}

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export interface ValidationState {
  status: ValidationStatus;
  errors: ValidationError[];
  lastValidContent?: string;
}
