import fetchMixin, { type IFetchRepo } from '@es-git/fetch-mixin';
import loadAsMixin, { type ILoadAsRepo } from '@es-git/load-as-mixin';
import MemoryRepo from '@es-git/memory-repo';
import mix from '@es-git/mix';
import object, { type IObjectRepo } from '@es-git/object-mixin';
import walkers, { type IWalkersRepo } from '@es-git/walkers-mixin';
import type { RefChange } from '@es-git/http-transport';
import { Mode } from '@es-git/core';
import {
  type GitRepoConfig,
  type GitFile,
  type GitCommit,
  type GitProviderOptions,
  type GitRepoHandle,
  type GitProviderInfo,
  GitFileNotFoundError,
  GitRepoNotFoundError,
  GitNetworkError,
  I18N,
} from 'orgnote-api';
import { DEFAULT_CONFIG } from 'src/constants/config';
import { to } from 'orgnote-api/utils';

type EsGitRepo = MemoryRepo & IObjectRepo & IWalkersRepo & ILoadAsRepo & IFetchRepo;

const createRepo = (): EsGitRepo => {
  const Repo = mix(MemoryRepo).with(object).with(walkers).with(loadAsMixin).with(fetchMixin, fetch);
  return new Repo();
};

const buildRepoUrl = (config: GitRepoConfig, options?: GitProviderOptions): string => {
  const corsProxy = config.corsProxy ?? options?.corsProxy ?? DEFAULT_CONFIG.developer.corsProxy;
  return `${corsProxy}${config.url}`;
};

const buildRefSpec = (config: GitRepoConfig): string => {
  if (config.branch) {
    return `refs/heads/${config.branch}:refs/heads/${config.branch}`;
  }
  return 'refs/heads/*:refs/heads/*';
};

const fetchRepo = async (
  config: GitRepoConfig,
  options?: GitProviderOptions,
): Promise<[EsGitRepo, RefChange]> => {
  const repo = createRepo();
  const url = buildRepoUrl(config, options);
  const refSpec = buildRefSpec(config);

  const safeFetch = to(() => repo.fetch(url, refSpec));
  const response = await safeFetch();

  if (response.isErr()) {
    throw new GitNetworkError(response.error.message);
  }

  const result = response.value;

  if (!result?.[0]) {
    throw new GitRepoNotFoundError(config.url);
  }

  return [repo, result[0]];
};

const findFileHashByPath = async (
  repo: EsGitRepo,
  path: string,
  treeHash: string,
): Promise<string | undefined> => {
  const nodes = path.split('/').filter(Boolean);
  let hash: string | undefined = treeHash;

  for (const node of nodes) {
    if (!hash) {
      break;
    }
    const tree = await repo.loadTree(hash);
    hash = tree[node]?.hash;
  }

  return hash;
};

const getTimestamp = (date: Date | { seconds: number; offset: number }): number => {
  if (date instanceof Date) {
    return Math.floor(date.getTime() / 1000);
  }
  return date.seconds;
};

const getTimezoneOffset = (date: Date | { seconds: number; offset: number }): number => {
  if (date instanceof Date) {
    return date.getTimezoneOffset();
  }
  return date.offset;
};

const createRepoHandle = (
  config: GitRepoConfig,
  options: GitProviderOptions | undefined,
): GitRepoHandle => {
  let currentRepo: EsGitRepo | undefined;
  let currentRef: RefChange | undefined;
  let closed = false;

  const ensureRepo = async (): Promise<{ repo: EsGitRepo; ref: RefChange }> => {
    if (closed) {
      throw new Error('Repository handle is closed');
    }
    if (!currentRepo || !currentRef) {
      [currentRepo, currentRef] = await fetchRepo(config, options);
    }
    return { repo: currentRepo, ref: currentRef };
  };

  const getTreeHash = async (): Promise<string> => {
    const { repo, ref } = await ensureRepo();
    const commit = await repo.loadCommit(ref.hash);
    return commit.tree;
  };

  const readFile: GitRepoHandle['readFile'] = async <
    T extends 'utf8' | 'binary' = 'utf8',
    R = T extends 'utf8' ? string : Uint8Array,
  >(
    path: string,
    encoding?: T,
  ): Promise<R> => {
    const { repo } = await ensureRepo();
    const treeHash = await getTreeHash();
    const fileHash = await findFileHashByPath(repo, path, treeHash);

    if (!fileHash) {
      throw new GitFileNotFoundError(path);
    }

    if (encoding === 'binary') {
      const blob = await repo.loadBlob(fileHash);
      return blob as R;
    }

    const text = await repo.loadText(fileHash);
    return text as R;
  };

  const listDirectory: GitRepoHandle['listDirectory'] = async (
    dirPath: string,
  ): Promise<GitFile[]> => {
    const { repo } = await ensureRepo();
    const treeHash = await getTreeHash();
    const targetDirHash = dirPath ? await findFileHashByPath(repo, dirPath, treeHash) : treeHash;

    if (!targetDirHash) {
      return [];
    }

    const tree = await repo.loadTree(targetDirHash);
    return Object.entries(tree).map(([name, entry]) => ({
      path: dirPath ? `${dirPath}/${name}` : name,
      hash: entry.hash,
      type: entry.mode === Mode.tree ? 'directory' : 'file',
    }));
  };

  const iterateFiles: GitRepoHandle['iterateFiles'] = async function* (
    dirPath: string,
    filter?: (file: GitFile) => boolean,
  ): AsyncGenerator<{ file: GitFile; content: string }> {
    const { repo } = await ensureRepo();
    const treeHash = await getTreeHash();
    const targetDirHash = dirPath ? await findFileHashByPath(repo, dirPath, treeHash) : treeHash;

    if (!targetDirHash) {
      return;
    }

    const tree = await repo.loadTree(targetDirHash);

    for (const [name, entry] of Object.entries(tree)) {
      if (entry.mode === Mode.tree) {
        continue;
      }

      const file: GitFile = {
        path: dirPath ? `${dirPath}/${name}` : name,
        hash: entry.hash,
        type: 'file',
      };

      if (filter && !filter(file)) {
        continue;
      }

      const content = await repo.loadText(entry.hash);
      yield { file, content };
    }
  };

  const fileExists: GitRepoHandle['fileExists'] = async (path: string): Promise<boolean> => {
    const { repo } = await ensureRepo();
    const treeHash = await getTreeHash();
    const fileHash = await findFileHashByPath(repo, path, treeHash);
    return !!fileHash;
  };

  const getLatestCommit: GitRepoHandle['getLatestCommit'] = async (): Promise<GitCommit> => {
    const { repo, ref } = await ensureRepo();
    const commit = await repo.loadCommit(ref.hash);

    return {
      hash: ref.hash,
      message: commit.message,
      tree: commit.tree,
      author: {
        name: commit.author.name,
        email: commit.author.email,
        timezoneOffset: getTimezoneOffset(commit.author.date),
      },
      timestamp: getTimestamp(commit.author.date),
    };
  };

  const refresh: GitRepoHandle['refresh'] = async (): Promise<void> => {
    if (closed) {
      throw new Error('Repository handle is closed');
    }
    [currentRepo, currentRef] = await fetchRepo(config, options);
  };

  const close: GitRepoHandle['close'] = (): void => {
    closed = true;
    currentRepo = undefined;
    currentRef = undefined;
  };

  return {
    config,
    readFile,
    listDirectory,
    iterateFiles,
    fileExists,
    getLatestCommit,
    refresh,
    close,
  };
};

export const ES_GIT_PROVIDER_ID = 'es-git';

export const createEsGitProviderInfo = (): GitProviderInfo => {
  const openRepo = async (
    config: GitRepoConfig,
    options?: GitProviderOptions,
  ): Promise<GitRepoHandle> => {
    const handle = createRepoHandle(config, options);
    await handle.getLatestCommit();
    return handle;
  };

  return {
    id: ES_GIT_PROVIDER_ID,
    openRepo,
    description: I18N.DEFAULT_GIT_PROVIDER_DESCRIPTION,
  };
};
