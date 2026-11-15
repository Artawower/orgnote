export class FileSystemChangedError extends Error {
  constructor(path: string) {
    super(`File system changed before the operation on ${path} could run`);
    this.name = 'FileSystemChangedError';
  }
}
