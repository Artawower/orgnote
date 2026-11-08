import type { ValidationError } from '../models/file-guard';

export class FileReadOnlyError extends Error {
  constructor(path: string, reason?: string) {
    const message = reason
      ? `Cannot write to read-only file: ${path}. Reason: ${reason}`
      : `Cannot write to read-only file: ${path}`;
    super(message);
    this.name = 'FileReadOnlyError';
  }
}

export class FileValidationError extends Error {
  public readonly errors: ValidationError[];

  constructor(path: string, errors: ValidationError[]) {
    const message = `Validation failed for: ${path}`;
    super(message);
    this.name = 'FileValidationError';
    this.errors = errors;
  }
}
