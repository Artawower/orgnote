import { mount } from '@vue/test-utils';
import { test, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import AppCode from './AppCode.vue';

const HighlightjsStub = defineComponent({
  name: 'HighlightjsStub',
  props: ['code', 'autodetect'],
  render() {
    return h('pre', {}, [h('code', {}, this.code ?? '')]);
  },
});

const globalStubs = {
  global: {
    components: {
      highlightjs: HighlightjsStub,
    },
  },
};

test('AppCode renders highlighted code when code prop is provided', () => {
  const wrapper = mount(AppCode, {
    props: { code: '<div>hello</div>' },
    ...globalStubs,
  });

  expect(wrapper.text()).toContain('hello');
  expect(wrapper.find('pre').exists()).toBe(true);
  expect(wrapper.find('code').exists()).toBe(true);
});

test('AppCode handles empty string code prop', () => {
  const wrapper = mount(AppCode, {
    props: { code: '' },
    ...globalStubs,
  });

  expect(wrapper.find('pre').exists()).toBe(true);
  expect(wrapper.find('code').exists()).toBe(true);
});

test('AppCode handles missing code prop without crashing', () => {
  const wrapper = mount(AppCode, {
    // @ts-expect-error intentionally testing missing required prop
    props: {},
    ...globalStubs,
  });

  expect(wrapper.find('pre').exists()).toBe(true);
  expect(wrapper.find('code').exists()).toBe(true);
});
