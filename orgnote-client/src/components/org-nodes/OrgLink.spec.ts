import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import type { OrgNode } from 'org-mode-ast';
import OrgLink from './OrgLink.vue';

const { mockHandleClick, mockHandleFileLink } = vi.hoisted(() => ({
  mockHandleClick: vi.fn(),
  mockHandleFileLink: vi.fn(),
}));

vi.mock('src/components/ContextMenu.vue', () => ({
  default: defineComponent({
    name: 'ContextMenuStub',
    props: {
      group: { type: String, required: true },
      data: { type: Object, required: true },
    },
    template: '<div class="context-menu-stub"><slot /></div>',
  }),
}));

vi.mock('src/composables/use-internal-link-handler', () => ({
  useInternalLinkHandler: () => ({
    handleClick: mockHandleClick,
    handleFileLink: mockHandleFileLink,
  }),
}));

const createLinkNode = (target: string, source: string, title?: string): OrgNode => {
  const linkUrl = {
    children: { get: (index: number) => (index === 1 ? { value: target } : undefined) },
  };
  const linkName = title
    ? { children: { get: (index: number) => (index === 1 ? { rawValue: title } : undefined) } }
    : undefined;
  const children = {
    length: title ? 4 : 2,
    get: (index: number) => (index === 1 ? linkUrl : index === 2 ? linkName : undefined),
  };
  return { rawValue: source, children } as unknown as OrgNode;
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('OrgLink exposes the original Org source to its context menu', () => {
  const wrapper = mount(OrgLink, {
    props: { node: createLinkNode('id:abc', '[[id:abc][Title]]', 'Title') },
  });
  const contextMenu = wrapper.findComponent({ name: 'ContextMenuStub' });

  expect(contextMenu.props('group')).toBe('org-link');
  expect(contextMenu.props('data')).toEqual({
    kind: 'org',
    target: 'id:abc',
    title: 'Title',
  });
});

test('OrgLink renders external links with the external context group', () => {
  const wrapper = mount(OrgLink, {
    props: {
      node: createLinkNode('https://example.com', '[[https://example.com][Example]]', 'Example'),
    },
  });
  const link = wrapper.find('a');

  expect(wrapper.findComponent({ name: 'ContextMenuStub' }).props('group')).toBe('external-link');
  expect(link.attributes('href')).toBe('https://example.com');
  expect(link.attributes('target')).toBe('_blank');
});
