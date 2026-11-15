import { test, expect } from 'vitest';
import { createPlan } from '../plan';
import type { LocalFile, RemoteFile, SyncStateData } from '../types';

const emptyState: SyncStateData = { files: {} };
const serverTime = '2024-01-01T00:00:00Z';
const LOWERCASE_HASH = 'a'.repeat(64);
const UPPERCASE_HASH = LOWERCASE_HASH.toUpperCase();

test('new local file → upload', () => {
  const localFiles: LocalFile[] = [{ path: 'a.org', mtime: 1000, size: 100 }];

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles: [],
    stateData: emptyState,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(plan.toUpload[0].path).toBe('a.org');
});

test.each([
  ['/.orgnote/config.toml', LOWERCASE_HASH],
  ['/same.org', LOWERCASE_HASH],
  ['/uppercase.org', UPPERCASE_HASH],
])(
  'matching local and remote content without state → download %s',
  (path, remoteHash) => {
    const localFiles: LocalFile[] = [
      { path, mtime: 1000, size: 100, contentHash: LOWERCASE_HASH },
    ];
    const remoteFiles: RemoteFile[] = [
      {
        path,
        version: 8,
        deleted: false,
        updatedAt: '',
        contentHash: remoteHash,
      },
    ];

    const plan = createPlan({
      localFiles,
      deletedLocally: [],
      remoteFiles,
      stateData: emptyState,
      serverTime,
    });

    expect(plan.toUpload).toHaveLength(0);
    expect(plan.toDownload).toEqual(remoteFiles);
  }
);

test('different local and remote content without state → upload local', () => {
  const path = '/.orgnote/config.toml';
  const localFiles: LocalFile[] = [
    { path, mtime: 1000, size: 100, contentHash: 'local-hash' },
  ];
  const remoteFiles: RemoteFile[] = [
    {
      path,
      version: 8,
      deleted: false,
      updatedAt: '',
      contentHash: 'remote-hash',
    },
  ];

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData: emptyState,
    serverTime,
  });

  expect(plan.toUpload).toEqual(localFiles);
  expect(plan.toDownload).toHaveLength(0);
});

test('new remote file → download', () => {
  const remoteFiles: RemoteFile[] = [
    { path: 'b.org', version: 1, deleted: false, updatedAt: '' },
  ];

  const plan = createPlan({
    localFiles: [],
    deletedLocally: [],
    remoteFiles,
    stateData: emptyState,
    serverTime,
  });

  expect(plan.toDownload).toHaveLength(1);
  expect(plan.toDownload[0].path).toBe('b.org');
});

test('unchanged file → skip', () => {
  const localFiles: LocalFile[] = [{ path: 'c.org', mtime: 1000, size: 100 }];
  const remoteFiles: RemoteFile[] = [
    { path: 'c.org', version: 1, deleted: false, updatedAt: '' },
  ];
  const stateData: SyncStateData = {
    files: {
      'c.org': { mtime: 1000, size: 100, version: 1, status: 'synced' },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(0);
  expect(plan.toDownload).toHaveLength(0);
  expect(plan.unchangedPaths).toEqual(['c.org']);
});

test('local changed → upload', () => {
  const localFiles: LocalFile[] = [{ path: 'd.org', mtime: 2000, size: 100 }];
  const remoteFiles: RemoteFile[] = [
    { path: 'd.org', version: 1, deleted: false, updatedAt: '' },
  ];
  const stateData: SyncStateData = {
    files: {
      'd.org': { mtime: 1000, size: 100, version: 1, status: 'synced' },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
});

test('remote changed → download', () => {
  const localFiles: LocalFile[] = [{ path: 'e.org', mtime: 1000, size: 100 }];
  const remoteFiles: RemoteFile[] = [
    { path: 'e.org', version: 2, deleted: false, updatedAt: '' },
  ];
  const stateData: SyncStateData = {
    files: {
      'e.org': { mtime: 1000, size: 100, version: 1, status: 'synced' },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toDownload).toHaveLength(1);
});

test('both changed → upload (conflict handled by server)', () => {
  const localFiles: LocalFile[] = [{ path: 'f.org', mtime: 3000, size: 100 }];
  const remoteFiles: RemoteFile[] = [
    {
      path: 'f.org',
      version: 2,
      deleted: false,
      updatedAt: '1970-01-01T00:00:02.000Z',
    },
  ];
  const stateData: SyncStateData = {
    files: {
      'f.org': { mtime: 1000, size: 100, version: 1, status: 'synced' },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(plan.toDownload).toHaveLength(0);
});

test('deleted locally → delete remote', () => {
  const deletedLocally = ['g.org'];
  const stateData: SyncStateData = {
    files: {
      'g.org': { mtime: 1000, size: 100, version: 1, status: 'synced' },
    },
  };

  const plan = createPlan({
    localFiles: [],
    deletedLocally,
    remoteFiles: [],
    stateData,
    serverTime,
  });

  expect(plan.toDeleteRemote).toContain('g.org');
});

test('deleted remotely → delete local', () => {
  const localFiles: LocalFile[] = [{ path: 'h.org', mtime: 1000, size: 100 }];
  const remoteFiles: RemoteFile[] = [
    { path: 'h.org', version: 2, deleted: true, updatedAt: '' },
  ];
  const stateData: SyncStateData = {
    files: {
      'h.org': { mtime: 1000, size: 100, version: 1, status: 'synced' },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toDeleteLocal).toContain('h.org');
});

test('deleted locally but modified remotely → download', () => {
  const deletedLocally = ['i.org'];
  const remoteFiles: RemoteFile[] = [
    { path: 'i.org', version: 2, deleted: false, updatedAt: '' },
  ];
  const stateData: SyncStateData = {
    files: {
      'i.org': { mtime: 1000, size: 100, version: 1, status: 'synced' },
    },
  };

  const plan = createPlan({
    localFiles: [],
    deletedLocally,
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toDownload).toHaveLength(1);
  expect(plan.toDeleteRemote).toHaveLength(0);
});

test('deleted remotely but modified locally → upload (local changes win)', () => {
  const localFiles: LocalFile[] = [{ path: 'j.org', mtime: 3000, size: 100 }];
  const remoteFiles: RemoteFile[] = [
    {
      path: 'j.org',
      version: 2,
      deleted: true,
      updatedAt: '1970-01-01T00:00:02.000Z',
    },
  ];
  const stateData: SyncStateData = {
    files: {
      'j.org': { mtime: 1000, size: 100, version: 1, status: 'synced' },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(plan.toDeleteLocal).toHaveLength(0);
});

test('file with error status → retry upload', () => {
  const localFiles: LocalFile[] = [{ path: 'k.org', mtime: 1000, size: 100 }];
  const stateData: SyncStateData = {
    files: {
      'k.org': {
        mtime: 1000,
        size: 100,
        version: 1,
        status: 'error',
        errorMessage: 'some error',
      },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles: [],
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(plan.toUpload[0].path).toBe('k.org');
});

test('mtime changed but same contentHash → skip upload', () => {
  const localFiles: LocalFile[] = [
    { path: 'l.org', mtime: 2000, size: 100, contentHash: 'same-hash' },
  ];
  const stateData: SyncStateData = {
    files: {
      'l.org': {
        mtime: 1000,
        size: 100,
        version: 1,
        status: 'synced',
        contentHash: 'same-hash',
      },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles: [],
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(0);
});

test('mtime same but different contentHash → upload', () => {
  const localFiles: LocalFile[] = [
    { path: 'm.org', mtime: 1000, size: 100, contentHash: 'new-hash' },
  ];
  const stateData: SyncStateData = {
    files: {
      'm.org': {
        mtime: 1000,
        size: 100,
        version: 1,
        status: 'synced',
        contentHash: 'old-hash',
      },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles: [],
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(plan.toUpload[0].path).toBe('m.org');
});

test('both hashes missing → fallback to mtime', () => {
  const localFiles: LocalFile[] = [{ path: 'n.org', mtime: 2000, size: 100 }];
  const stateData: SyncStateData = {
    files: {
      'n.org': {
        mtime: 1000,
        size: 100,
        version: 1,
        status: 'synced',
      },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles: [],
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(plan.toUpload[0].path).toBe('n.org');
});

test('local hash present and stored hash absent → fallback to mtime', () => {
  const localFiles: LocalFile[] = [
    { path: 'o.org', mtime: 1000, size: 100, contentHash: 'new-hash' },
  ];
  const stateData: SyncStateData = {
    files: {
      'o.org': {
        mtime: 1000,
        size: 100,
        version: 1,
        status: 'synced',
      },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles: [],
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(0);
});

test('local hash present, stored hash absent, different mtime → upload', () => {
  const localFiles: LocalFile[] = [
    { path: 'p.org', mtime: 2000, size: 100, contentHash: 'some-hash' },
  ];
  const stateData: SyncStateData = {
    files: {
      'p.org': {
        mtime: 1000,
        size: 100,
        version: 1,
        status: 'synced',
      },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles: [],
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
  expect(plan.toUpload[0].path).toBe('p.org');
});

test('unchanged pending file retries the local upload', () => {
  const path = '/.orgnote/config.toml';
  const localFiles: LocalFile[] = [
    { path, mtime: 1000, size: 100, contentHash: 'local-hash' },
  ];
  const remoteFiles: RemoteFile[] = [
    { path, version: 8, deleted: false, updatedAt: '' },
  ];
  const stateData: SyncStateData = {
    files: {
      [path]: {
        mtime: 1000,
        size: 100,
        version: 7,
        status: 'pending',
        contentHash: 'local-hash',
      },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toDownload).toHaveLength(0);
  expect(plan.toUpload).toHaveLength(1);
});

test('legacy conflict state retries the local upload', () => {
  const path = '/.orgnote/config.toml';
  const localFiles: LocalFile[] = [
    { path, mtime: 1000, size: 100, contentHash: 'local-hash' },
  ];
  const remoteFiles: RemoteFile[] = [
    { path, version: 7, deleted: false, updatedAt: '' },
  ];
  const stateData: SyncStateData = {
    files: {
      [path]: {
        mtime: 1000,
        size: 100,
        version: 7,
        status: 'conflict',
        contentHash: 'local-hash',
      },
    },
  };

  const plan = createPlan({
    localFiles,
    deletedLocally: [],
    remoteFiles,
    stateData,
    serverTime,
  });

  expect(plan.toUpload).toHaveLength(1);
});
