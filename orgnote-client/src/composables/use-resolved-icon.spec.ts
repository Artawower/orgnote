import { test, expect } from 'vitest';
import { ref, defineComponent, h } from 'vue';
import { useResolvedIcon } from './use-resolved-icon';

const MockIconComponent = defineComponent({
  name: 'MockIcon',
  render: () => h('svg'),
});

test('useResolvedIcon returns iconString for string icon', () => {
  const { iconString, iconComponent } = useResolvedIcon('sym_o_settings');

  expect(iconString.value).toBe('sym_o_settings');
  expect(iconComponent.value).toBeUndefined();
});

test('useResolvedIcon returns iconComponent for component icon', () => {
  const { iconString, iconComponent } = useResolvedIcon(MockIconComponent);

  expect(iconString.value).toBeUndefined();
  expect(iconComponent.value).toBe(MockIconComponent);
});

test('useResolvedIcon returns undefined for both when icon is undefined', () => {
  const { iconString, iconComponent } = useResolvedIcon(undefined);

  expect(iconString.value).toBeUndefined();
  expect(iconComponent.value).toBeUndefined();
});

test('useResolvedIcon reacts to ref changes from string to component', () => {
  const iconRef = ref<string | typeof MockIconComponent>('sym_o_home');
  const { iconString, iconComponent } = useResolvedIcon(iconRef);

  expect(iconString.value).toBe('sym_o_home');
  expect(iconComponent.value).toBeUndefined();

  iconRef.value = MockIconComponent;

  expect(iconString.value).toBeUndefined();
  expect(iconComponent.value).toEqual(MockIconComponent);
});

test('useResolvedIcon reacts to ref changes from component to string', () => {
  const iconRef = ref<string | typeof MockIconComponent>(MockIconComponent);
  const { iconString, iconComponent } = useResolvedIcon(iconRef);

  expect(iconString.value).toBeUndefined();
  expect(iconComponent.value).toEqual(MockIconComponent);

  iconRef.value = 'sym_o_delete';

  expect(iconString.value).toBe('sym_o_delete');
  expect(iconComponent.value).toBeUndefined();
});

test('useResolvedIcon reacts to ref changes to undefined', () => {
  const iconRef = ref<string | undefined>('sym_o_edit');
  const { iconString, iconComponent } = useResolvedIcon(iconRef);

  expect(iconString.value).toBe('sym_o_edit');

  iconRef.value = undefined;

  expect(iconString.value).toBeUndefined();
  expect(iconComponent.value).toBeUndefined();
});
