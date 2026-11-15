import { beforeEach, expect, test, vi } from 'vitest';
import clone from 'rfdc';
import type { SyncPlan } from 'orgnote-api';
import { DEFAULT_CONFIG } from 'src/constants/config';
import {
  recordConfigFileChangeEvent,
  recordConfigLifecycleEvent,
  recordConfigPlanEvent,
  recordConfigSyncOperationEvent,
} from './config-lifecycle-record';

const mocks = vi.hoisted(() => ({
  info: vi.fn(),
}));

vi.mock('src/boot/logger', () => ({
  logger: { info: mocks.info },
}));

beforeEach(() => {
  mocks.info.mockClear();
});

test('recordConfigLifecycleEvent records safe config characteristics without endpoint value', () => {
  const config = clone()(DEFAULT_CONFIG);
  config.network.apiUrl = 'https://api.example.com/private';
  config.synchronization.type = 'api';

  recordConfigLifecycleEvent('disk-config-applied', config, { source: 'watcher' });

  const [message, context] = mocks.info.mock.calls[0] ?? [];
  expect(message).toBe('Config lifecycle');
  expect(context).toMatchObject({
    apiEndpointKind: 'remote',
    event: 'disk-config-applied',
    source: 'watcher',
    syncType: 'api',
  });
  expect(JSON.stringify(context)).not.toContain(config.network.apiUrl);
});

test.each([
  ['/api/v1', 'relative'],
  ['http://localhost:3000/api/v1', 'localhost'],
  ['custom://api.example.com', 'custom'],
  ['', 'missing'],
])('recordConfigLifecycleEvent classifies endpoint %s as %s', (apiUrl, endpointKind) => {
  const config = clone()(DEFAULT_CONFIG);
  config.network.apiUrl = apiUrl;

  recordConfigLifecycleEvent('snapshot', config);

  expect(mocks.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({ apiEndpointKind: endpointKind }),
  );
});

test.each([
  'memory-config-changed',
  'config-storage-context-changed',
  'memory-config-write-requested',
])('suppresses high-frequency event %s when developerMode is false or config missing', (event) => {
  const prodConfig = clone()(DEFAULT_CONFIG);
  prodConfig.developer.developerMode = false;

  recordConfigLifecycleEvent(event, prodConfig);
  expect(mocks.info).not.toHaveBeenCalled();

  recordConfigLifecycleEvent(event);
  expect(mocks.info).not.toHaveBeenCalled();
});

test.each([
  'memory-config-changed',
  'config-storage-context-changed',
  'memory-config-write-requested',
])('records high-frequency event %s when developerMode is true', (event) => {
  const devConfig = clone()(DEFAULT_CONFIG);
  devConfig.developer.developerMode = true;

  recordConfigLifecycleEvent(event, devConfig);
  expect(mocks.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({ event }),
  );
});

test.each([
  'disk-config-applied',
  'default-config-applied',
  'config-read-failed',
  'config-metadata-read-failed',
  'config-write-failed',
  'empty-config-read-deferred',
  'bootstrap-remote-config-applied',
])('preserves production lifecycle event %s even when developerMode is false', (event) => {
  const prodConfig = clone()(DEFAULT_CONFIG);
  prodConfig.developer.developerMode = false;

  recordConfigLifecycleEvent(event, prodConfig);
  expect(mocks.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({ event }),
  );
});

test('recordConfigFileChangeEvent records only config watcher events', () => {
  recordConfigFileChangeEvent('poll', { path: '/note.org', type: 'delete' });
  recordConfigFileChangeEvent('native', { path: '/.orgnote/config.toml', type: 'delete' });

  expect(mocks.info).toHaveBeenCalledTimes(1);
  expect(mocks.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({
      changeType: 'delete',
      event: 'config-file-change',
      source: 'native',
    }),
  );
});

test('recordConfigFileChangeEvent records rename events matching previousPath', () => {
  recordConfigFileChangeEvent('poll', {
    path: '/note.org',
    previousPath: '/.orgnote/config.toml',
    type: 'rename',
  });

  expect(mocks.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({
      changeType: 'rename',
      event: 'config-file-change',
      source: 'poll',
    }),
  );
});

test('recordConfigPlanEvent records the selected config operation', () => {
  const plan: SyncPlan = {
    serverTime: '2026-09-03T00:00:00Z',
    toDeleteLocal: [],
    toDeleteRemote: [],
    toDownload: [],
    toUpload: [
      {
        path: '/.orgnote/config.toml',
        mtime: 100,
        size: 200,
        contentHash: 'private-content-hash',
      },
    ],
    unchangedPaths: [],
  };

  recordConfigPlanEvent(plan);

  const [, context] = mocks.info.mock.calls[0] ?? [];
  expect(context).toMatchObject({
    event: 'config-sync-plan',
    operation: 'upload',
    size: 200,
  });
  expect(JSON.stringify(context)).not.toContain('private-content-hash');
});

test.each([
  ['delete-local', { toDeleteLocal: ['/.orgnote/config.toml'], toDeleteRemote: [] }],
  ['delete-remote', { toDeleteLocal: [], toDeleteRemote: ['/.orgnote/config.toml'] }],
])('recordConfigPlanEvent records %s config operation', (operation, partialPlan) => {
  const plan: SyncPlan = {
    serverTime: '2026-09-03T00:00:00Z',
    toDownload: [],
    toUpload: [],
    unchangedPaths: [],
    ...partialPlan,
  };

  recordConfigPlanEvent(plan);

  expect(mocks.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({
      event: 'config-sync-plan',
      operation,
    }),
  );
});

test('recordConfigSyncOperationEvent ignores non-config paths and records config completion', () => {
  recordConfigSyncOperationEvent('config-sync-operation-completed', '/note.org', 'download');
  recordConfigSyncOperationEvent(
    'config-sync-operation-completed',
    '/.orgnote/config.toml',
    'download',
  );

  expect(mocks.info).toHaveBeenCalledTimes(1);
  expect(mocks.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({
      event: 'config-sync-operation-completed',
      operation: 'download',
    }),
  );
});
