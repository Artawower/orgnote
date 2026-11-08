import { expect, test, vi } from 'vitest';
import { DefaultCommands } from 'orgnote-api';
import { getGraphCommands } from './graph-commands';

const execute = vi.fn<() => Promise<void>>();
const open = vi.fn();

vi.mock('src/components/graph/GraphInfoModal.vue', () => ({
  default: { name: 'GraphInfoModal' },
}));

test('getGraphCommands falls back to full graph settings when modal data is missing', async () => {
  execute.mockResolvedValue();

  const api = {
    core: {
      useCommands: () => ({ execute }),
    },
    ui: {
      useModal: () => ({ open }),
    },
  };

  const [command] = getGraphCommands();
  if (!command) {
    throw new Error('Expected graph settings command');
  }

  await command.handler?.(api as never, undefined as never);

  expect(execute).toHaveBeenCalledWith(DefaultCommands.OPEN_GRAPH_SETTINGS, undefined, {
    interactive: true,
  });
  expect(open).not.toHaveBeenCalled();
});

test('getGraphCommands opens graph modal when data is provided', async () => {
  execute.mockResolvedValue();

  const api = {
    core: {
      useCommands: () => ({ execute }),
    },
    ui: {
      useModal: () => ({ open }),
    },
  };

  const data = {
    nodesCount: 3,
    edgesCount: 2,
    config: {
      nodeRelSize: 4,
      linkDistance: 50,
      chargeStrength: -80,
      warmupTicks: 150,
      velocityDecay: 0.3,
      initialZoom: 1.5,
      labelFontSize: 12,
      linkWidth: 0.5,
    },
    refresh: vi.fn(),
    configChange: vi.fn(),
  };

  const [command] = getGraphCommands();
  if (!command) {
    throw new Error('Expected graph settings command');
  }

  await command.handler?.(api as never, { data } as never);

  expect(execute).not.toHaveBeenCalled();
  expect(open).toHaveBeenCalledTimes(1);
  expect(open.mock.calls[0]?.[1]).toMatchObject({
    mini: true,
    position: 'bottom',
    modalProps: data,
  });
});
