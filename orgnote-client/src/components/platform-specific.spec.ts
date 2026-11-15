import { expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PlatformSpecific from './PlatformSpecific.vue';
import { Platform } from 'quasar';

vi.mock('quasar', () => ({
  Platform: {
    is: {
      mobile: false,
      desktop: false,
      ios: false,
      android: false,
    },
  },
}));

test('renders slot content when mobile platform matches', () => {
  Platform.is.mobile = true;
  Platform.is.desktop = false;

  const wrapper = mount(PlatformSpecific, {
    props: { mobile: true },
    slots: { default: '<p>Mobile content</p>' },
  });

  expect(wrapper.html()).toContain('<p>Mobile content</p>');
});

test('does not render slot content when mobile platform does not match', () => {
  Platform.is.mobile = false;
  Platform.is.desktop = true;

  const wrapper = mount(PlatformSpecific, {
    props: { mobile: true },
    slots: { default: '<p>Mobile content</p>' },
  });

  expect(wrapper.html()).not.toContain('<p>Mobile content</p>');
});

test('renders slot content when desktop platform matches', () => {
  Platform.is.desktop = true;
  Platform.is.mobile = false;

  const wrapper = mount(PlatformSpecific, {
    props: { desktop: true },
    slots: { default: '<p>Desktop content</p>' },
  });

  expect(wrapper.html()).toContain('<p>Desktop content</p>');
});

test('does not render slot content when desktop platform does not match', () => {
  Platform.is.desktop = false;
  Platform.is.mobile = true;

  const wrapper = mount(PlatformSpecific, {
    props: { desktop: true },
    slots: { default: '<p>Desktop content</p>' },
  });

  expect(wrapper.html()).not.toContain('<p>Desktop content</p>');
});

test('renders slot content when ios platform matches', () => {
  Platform.is.ios = true;
  Platform.is.android = false;

  const wrapper = mount(PlatformSpecific, {
    props: { ios: true },
    slots: { default: '<p>iOS content</p>' },
  });

  expect(wrapper.html()).toContain('<p>iOS content</p>');
});

test('does not render slot content when ios platform does not match', () => {
  Platform.is.ios = false;
  Platform.is.android = true;

  const wrapper = mount(PlatformSpecific, {
    props: { ios: true },
    slots: { default: '<p>iOS content</p>' },
  });

  expect(wrapper.html()).not.toContain('<p>iOS content</p>');
});

test('renders slot content when android platform matches', () => {
  Platform.is.android = true;
  Platform.is.ios = false;

  const wrapper = mount(PlatformSpecific, {
    props: { android: true },
    slots: { default: '<p>Android content</p>' },
  });

  expect(wrapper.html()).toContain('<p>Android content</p>');
});

test('does not render slot content when android platform does not match', () => {
  Platform.is.android = false;
  Platform.is.ios = true;

  const wrapper = mount(PlatformSpecific, {
    props: { android: true },
    slots: { default: '<p>Android content</p>' },
  });

  expect(wrapper.html()).not.toContain('<p>Android content</p>');
});

test('does not render slot content when no matching platform is provided', () => {
  Platform.is.mobile = false;
  Platform.is.desktop = false;
  Platform.is.ios = false;
  Platform.is.android = false;

  const wrapper = mount(PlatformSpecific, {
    props: { mobile: true, desktop: true, ios: true, android: true },
    slots: { default: '<p>Content</p>' },
  });

  expect(wrapper.html()).not.toContain('<p>Content</p>');
});
