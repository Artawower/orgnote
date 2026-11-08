export interface GitFile {
  path: string;
  hash: string;
  type: 'file' | 'directory';
}

export interface GitCommit {
  hash: string;
  message: string;
  tree?: string;
  author: GitPerson;
  timestamp: number;
}

export interface GitPerson {
  name: string;
  email: string;
  timezoneOffset?: number;
}

export interface GitRepoConfig {
  url: string;
  branch?: string;
  corsProxy?: string;
  auth?: {
    username?: string;
    token?: string;
  };
}

export interface GitProviderOptions {
  corsProxy: string;
}

export interface GitRepoHandle {
  readonly config: GitRepoConfig;

  readFile: <
    T extends 'utf8' | 'binary' = 'utf8',
    R = T extends 'utf8' ? string : Uint8Array,
  >(
    path: string,
    encoding?: T
  ) => Promise<R>;

  listDirectory: (dirPath: string) => Promise<GitFile[]>;

  iterateFiles: (
    dirPath: string,
    filter?: (file: GitFile) => boolean
  ) => AsyncGenerator<{ file: GitFile; content: string }>;

  fileExists: (path: string) => Promise<boolean>;

  getLatestCommit: () => Promise<GitCommit>;

  refresh: () => Promise<void>;

  close: () => void;
}

export interface GitProviderInfo {
  id: string;
  openRepo: (
    config: GitRepoConfig,
    options?: GitProviderOptions
  ) => Promise<GitRepoHandle>;
  description?: string;
}
