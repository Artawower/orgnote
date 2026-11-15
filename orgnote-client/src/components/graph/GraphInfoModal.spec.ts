import { mount } from '@vue/test-utils';
import type { GraphUiConfig } from 'orgnote-api';
import { expect, test, vi } from 'vitest';
import { DEFAULT_GRAPH_CONFIG } from 'src/constants/graph-defaults';
import GraphInfoModal from './GraphInfoModal.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

const graphConfig: GraphUiConfig = {
  ...DEFAULT_GRAPH_CONFIG,
  nodeRelSize: 22,
};

const stubs = {
  AppFlex: { template: '<div><slot /></div>' },
  AppBadge: { props: ['label'], template: '<span>{{ label }}</span>' },
  CardWrapper: { template: '<div><slot /></div>' },
  MenuItem: {
    template: '<div v-bind="$attrs"><slot /><slot name="right" /></div>',
  },
  InputField: {
    props: ['modelValue', 'name'],
    emits: ['update:modelValue'],
    template: '<input :name="name" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
};

const mountGraphInfoModal = (configChange = vi.fn()) =>
  mount(GraphInfoModal, {
    props: {
      nodesCount: 601,
      edgesCount: 66,
      config: graphConfig,
      refresh: vi.fn(),
      configChange,
    },
    global: { stubs },
  });

test('GraphInfoModal renders editable graph config inputs', async () => {
  const configChange = vi.fn();
  const wrapper = mountGraphInfoModal(configChange);

  const nodeSizeInput = wrapper.get('input[name="nodeRelSize"]');
  expect(wrapper.findAll('input')).toHaveLength(8);

  await nodeSizeInput.setValue('20');

  expect(configChange).toHaveBeenCalledWith({
    ...graphConfig,
    nodeRelSize: 20,
  });
});

test('GraphInfoModal resets graph config to defaults', async () => {
  const configChange = vi.fn();
  const wrapper = mountGraphInfoModal(configChange);

  await wrapper.get('.reset-defaults').trigger('click');

  expect(configChange).toHaveBeenCalledWith(DEFAULT_GRAPH_CONFIG);
});
