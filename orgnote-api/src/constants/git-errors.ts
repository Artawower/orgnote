export class GitFileNotFoundError extends Error {
  constructor(path: string) {
    super(`Git file not found: ${path}`);
    this.name = 'GitFileNotFoundError';
  }
}

export class GitRepoNotFoundError extends Error {
  constructor(url: string) {
    super(`Git repository not found: ${url}`);
    this.name = 'GitRepoNotFoundError';
  }
}

export class GitNetworkError extends Error {
  constructor(message: string) {
    super(`Git network error: ${message}`);
    this.name = 'GitNetworkError';
  }
}
