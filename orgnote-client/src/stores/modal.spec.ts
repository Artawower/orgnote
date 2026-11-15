import { test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { storeToRefs } from 'pinia';
import { useModalStore } from './modal';
import { defineComponent, markRaw } from 'vue';

beforeEach(() => {
  setActivePinia(createPinia());
});

test('initial state', () => {
  const store = useModalStore();

  expect(store.component).toBeUndefined();
  expect(store.config).toBeUndefined();
  expect(store.title).toBeUndefined();
});

test('open method adds a new component to the stack', () => {
  const store = useModalStore();
  const mockComponent = defineComponent({});

  store.open(mockComponent, { title: 'Test Modal', closable: true });

  expect(store.component).toBe(mockComponent);
  expect(store.config).toEqual({ title: 'Test Modal', closable: true });
  expect(store.title).toBe('Test Modal');
});

test('open method prevents duplicate components', () => {
  const store = useModalStore();
  const mockComponent = defineComponent({});

  store.open(mockComponent, { title: 'First Modal', closable: true });
  store.open(mockComponent, { title: 'Second Modal', closable: false });

  expect(store.component).toBe(mockComponent);
  expect(store.config).toEqual({ title: 'First Modal', closable: true });
  expect(store.title).toBe('First Modal');
});

test('close method removes the last component from the stack', () => {
  const store = useModalStore();
  const mockComponent1 = defineComponent({});
  const mockComponent2 = defineComponent({});

  store.open(mockComponent1);
  store.open(mockComponent2);
  store.close();

  expect(store.component).toBe(mockComponent1);
  store.close();
});

test('close method does nothing if stack is empty', () => {
  const store = useModalStore();

  store.close();

  expect(store.component).toBeUndefined();
});

test('closeAll method clears the stack and closes the modal', () => {
  const store = useModalStore();
  const mockComponent1 = defineComponent({});
  const mockComponent2 = defineComponent({});

  store.open(mockComponent1);
  store.open(mockComponent2);
  store.closeAll();

  expect(store.component).toBeUndefined();
  expect(store.config).toBeUndefined();
});

test('ModalStore close on empty opened store keeps array reference', () => {
  const store = useModalStore();
  const { modals } = storeToRefs(store);
  const modalComponent = markRaw({ template: '<div>ModalContent</div>' });

  void store.open(modalComponent);
  store.close();

  const referenceAfterFirstClose = modals.value;

  store.close();

  expect(modals.value).toBe(referenceAfterFirstClose);
  expect(modals.value.length).toBe(0);
});

test('ModalStore close on never-opened store keeps initial array reference', () => {
  const store = useModalStore();
  const { modals } = storeToRefs(store);
  const initialReference = modals.value;

  store.close();

  expect(modals.value).toBe(initialReference);
  expect(modals.value.length).toBe(0);
});

test('ModalStore close resolves promise then open new modal works', async () => {
  const store = useModalStore();
  const modalA = markRaw(defineComponent({ template: '<div>A</div>' }));
  const modalB = markRaw(defineComponent({ template: '<div>B</div>' }));

  const closedA = store.open<string>(modalA);

  expect(store.modals.length).toBe(1);
  expect(store.component).toBe(modalA);

  store.close('selected-command');

  const resultA = await closedA;
  expect(resultA).toBe('selected-command');
  expect(store.modals.length).toBe(0);

  store.open(modalB, { title: 'System Info', wide: true });

  expect(store.modals.length).toBe(1);
  expect(store.component).toBe(modalB);
  expect(store.title).toBe('System Info');
});

test('ModalStore sequential close and reopen preserves stack integrity', async () => {
  const store = useModalStore();
  const completion = markRaw(defineComponent({ template: '<div>Completion</div>' }));
  const systemInfo = markRaw(defineComponent({ template: '<div>SystemInfo</div>' }));
  const logs = markRaw(defineComponent({ template: '<div>Logs</div>' }));

  const closed1 = store.open<string>(completion, { position: 'top' });
  store.close('cmd-1');
  const result1 = await closed1;
  expect(result1).toBe('cmd-1');

  const closed2 = store.open(systemInfo, { title: 'Info', wide: true });
  expect(store.modals.length).toBe(1);
  expect(store.component).toBe(systemInfo);

  store.close();
  await closed2;

  const closed3 = store.open(logs, { title: 'Logs' });
  expect(store.modals.length).toBe(1);
  expect(store.component).toBe(logs);
  expect(store.title).toBe('Logs');

  store.close();
  await closed3;
  expect(store.modals.length).toBe(0);
});

test('ModalStore close then immediate open produces correct stack', () => {
  const store = useModalStore();
  const modalA = markRaw(defineComponent({ template: '<div>A</div>' }));
  const modalB = markRaw(defineComponent({ template: '<div>B</div>' }));

  store.open(modalA, { title: 'Modal A' });
  expect(store.modals.length).toBe(1);
  expect(store.component).toBe(modalA);

  store.close();
  store.open(modalB, { title: 'Modal B' });

  expect(store.modals.length).toBe(1);
  expect(store.component).toBe(modalB);
  expect(store.title).toBe('Modal B');
});

test('ModalStore close then immediate open resolves first modal promise', async () => {
  const store = useModalStore();
  const modalA = markRaw(defineComponent({ template: '<div>A</div>' }));
  const modalB = markRaw(defineComponent({ template: '<div>B</div>' }));

  const closedA = store.open<string>(modalA);

  store.close('result-from-a');
  store.open(modalB);

  const resultA = await closedA;
  expect(resultA).toBe('result-from-a');
});

test('ModalStore close then immediate open with same component creates fresh modal', () => {
  const store = useModalStore();
  const modalA = markRaw(defineComponent({ template: '<div>A</div>' }));

  const firstPromise = store.open(modalA, { title: 'First' });
  store.close();

  const secondPromise = store.open(modalA, { title: 'Second' });

  expect(store.modals.length).toBe(1);
  expect(store.component).toBe(modalA);
  expect(store.title).toBe('Second');
  expect(secondPromise).not.toBe(firstPromise);
});

test('ModalStore closeAll resolves all pending promises with undefined', async () => {
  const store = useModalStore();
  const modalA = markRaw(defineComponent({ template: '<div>A</div>' }));
  const modalB = markRaw(defineComponent({ template: '<div>B</div>' }));

  const closedA = store.open<string>(modalA);
  const closedB = store.open<string>(modalB);

  store.closeAll();

  const resultA = await closedA;
  const resultB = await closedB;

  expect(resultA).toBeUndefined();
  expect(resultB).toBeUndefined();
  expect(store.modals.length).toBe(0);
});
