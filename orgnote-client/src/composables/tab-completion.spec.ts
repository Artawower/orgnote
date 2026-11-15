import { test, expect, vi } from 'vitest';
import { useTabCompletion } from './tab-completion';
import type { OrgNoteApi } from 'orgnote-api';
import type { Router } from 'vue-router';

const mockConfig = {
  config: {
    completion: {
      fuseThreshold: 0.3,
    },
  },
};

test('useTabCompletion opens completion with correct configuration', async () => {
  const mockCompletion = {
    open: vi.fn(),
  };

  const mockPanes = {
    'pane-1': {
      value: {
        id: 'pane-1',
        tabs: {
          value: {
            'tab-1': {
              id: 'tab-1',
              title: 'Tab 1',
              paneId: 'pane-1',
              router: {} as Router,
            },
            'tab-2': {
              id: 'tab-2',
              title: 'Tab 2',
              paneId: 'pane-1',
              router: {} as Router,
            },
          },
        },
      },
    },
  };

  const mockPaneStore = {
    panes: mockPanes,
    selectTab: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      useCompletion: () => mockCompletion,
      usePane: () => mockPaneStore,
      useConfig: () => mockConfig,
    } as unknown as OrgNoteApi['core'],
  };

  await useTabCompletion(mockApi as OrgNoteApi);

  expect(mockCompletion.open).toHaveBeenCalledWith({
    itemsGetter: expect.any(Function),
    placeholder: expect.any(String),
    type: 'choice',
    searchText: '',
  });
});

test('useTabCompletion itemsGetter returns all tabs when no filter', async () => {
  const mockCompletion = {
    open: vi.fn(),
  };

  const mockPanes = {
    'pane-1': {
      value: {
        id: 'pane-1',
        tabs: {
          value: {
            'tab-1': {
              id: 'tab-1',
              title: 'First Tab',
              paneId: 'pane-1',
              router: {} as Router,
            },
            'tab-2': {
              id: 'tab-2',
              title: 'Second Tab',
              paneId: 'pane-1',
              router: {} as Router,
            },
          },
        },
      },
    },
  };

  const mockPaneStore = {
    panes: mockPanes,
    selectTab: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      useCompletion: () => mockCompletion,
      usePane: () => mockPaneStore,
      useConfig: () => mockConfig,
    } as unknown as OrgNoteApi['core'],
  };

  await useTabCompletion(mockApi as OrgNoteApi);

  const openCall = mockCompletion.open.mock.calls[0]?.[0];
  if (!openCall) throw new Error('openCall is undefined');
  const itemsGetter = openCall.itemsGetter;
  const result = itemsGetter('');

  expect(result.total).toBe(2);
  expect(result.result).toHaveLength(2);
  expect(result.result[0].title).toBe('First Tab');
  expect(result.result[1].title).toBe('Second Tab');
});

test('useTabCompletion itemsGetter filters tabs correctly', async () => {
  const mockCompletion = {
    open: vi.fn(),
  };

  const mockPanes = {
    'pane-1': {
      value: {
        id: 'pane-1',
        tabs: {
          value: {
            'tab-1': {
              id: 'tab-1',
              title: 'JavaScript File',
              paneId: 'pane-1',
              router: {} as Router,
            },
            'tab-2': {
              id: 'tab-2',
              title: 'Python Script',
              paneId: 'pane-1',
              router: {} as Router,
            },
          },
        },
      },
    },
  };

  const mockPaneStore = {
    panes: mockPanes,
    selectTab: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      useCompletion: () => mockCompletion,
      usePane: () => mockPaneStore,
      useConfig: () => mockConfig,
    } as unknown as OrgNoteApi['core'],
  };

  await useTabCompletion(mockApi as OrgNoteApi);

  const openCall = mockCompletion.open.mock.calls[0]?.[0];
  if (!openCall) throw new Error('openCall is undefined');
  const itemsGetter = openCall.itemsGetter;
  const result = itemsGetter('Java');

  expect(result.total).toBe(1);
  expect(result.result).toHaveLength(1);
  expect(result.result[0].title).toBe('JavaScript File');
});

test('useTabCompletion item commandHandler calls selectTab with correct parameters', async () => {
  const mockCompletion = {
    open: vi.fn(),
  };

  const mockPanes = {
    'pane-1': {
      value: {
        id: 'pane-1',
        tabs: {
          value: {
            'tab-1': {
              id: 'tab-1',
              title: 'Test Tab',
              paneId: 'pane-1',
              router: {} as Router,
            },
          },
        },
      },
    },
  };

  const mockPaneStore = {
    panes: mockPanes,
    selectTab: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      useCompletion: () => mockCompletion,
      usePane: () => mockPaneStore,
      useConfig: () => mockConfig,
    } as unknown as OrgNoteApi['core'],
  };

  await useTabCompletion(mockApi as OrgNoteApi);

  const openCall = mockCompletion.open.mock.calls[0]?.[0];
  if (!openCall) throw new Error('openCall is undefined');
  const itemsGetter = openCall.itemsGetter;
  const result = itemsGetter('');

  result.result[0].commandHandler();

  expect(mockPaneStore.selectTab).toHaveBeenCalledWith('pane-1', 'tab-1');
});

test('useTabCompletion handles empty panes gracefully', async () => {
  const mockCompletion = {
    open: vi.fn(),
  };

  const mockPaneStore = {
    panes: {},
    selectTab: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      useCompletion: () => mockCompletion,
      usePane: () => mockPaneStore,
      useConfig: () => mockConfig,
    } as unknown as OrgNoteApi['core'],
  };

  await useTabCompletion(mockApi as OrgNoteApi);

  const openCall = mockCompletion.open.mock.calls[0]?.[0];
  if (!openCall) throw new Error('openCall is undefined');
  const itemsGetter = openCall.itemsGetter;
  const result = itemsGetter('');

  expect(result.total).toBe(0);
  expect(result.result).toHaveLength(0);
});
