import { mount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { OrgNode } from 'org-mode-ast';
import OrgSrcBlock from './OrgSrcBlock.vue';
import { getSrcBlockCode } from './src-block-node';

vi.mock('./src-block-node', () => ({
  getSrcBlockCode: vi.fn(() => 'mocked source code'),
}));

const AppCodeStub = defineComponent({
  name: 'AppCodeStub',
  props: { code: { type: String, default: '' } },
  render() {
    return h('div', { class: 'app-code-stub' }, this.code);
  },
});

const createMockNode = (overrides: Partial<OrgNode> = {}): OrgNode =>
  ({
    rawValue: 'default code',
    children: [],
    ...overrides,
  }) as OrgNode;

test('OrgSrcBlock renders code content through AppCode', () => {
  const mockNode = createMockNode();
  const wrapper = mount(OrgSrcBlock, {
    props: { node: mockNode },
    global: {
      stubs: {
        AppCode: AppCodeStub,
      },
    },
  });

  const appCode = wrapper.find('.app-code-stub');
  expect(appCode.exists()).toBe(true);
  expect(getSrcBlockCode).toHaveBeenCalledWith(mockNode);
  expect(appCode.text()).toBe('mocked source code');
});

test('OrgSrcBlock uses nodeGetter when provided', () => {
  const fallbackNode = createMockNode();
  const dynamicNode = createMockNode({ rawValue: 'dynamic code' });
  const nodeGetter = () => dynamicNode;

  mount(OrgSrcBlock, {
    props: { node: fallbackNode, nodeGetter },
    global: {
      stubs: {
        AppCode: AppCodeStub,
      },
    },
  });

  expect(getSrcBlockCode).toHaveBeenCalledWith(dynamicNode);
});
