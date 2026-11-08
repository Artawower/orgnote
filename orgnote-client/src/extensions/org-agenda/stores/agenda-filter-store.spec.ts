import { beforeEach, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgendaFilterStore } from './agenda-filter-store';

beforeEach(() => {
  setActivePinia(createPinia());
});

test('AgendaFilterStore selects and clears a file independently from search', () => {
  const store = useAgendaFilterStore();
  store.searchQuery = 'quarterly';

  store.setFileFilter('/agenda/work.org');

  expect(store.selectedFilePath).toBe('/agenda/work.org');
  expect(store.searchQuery).toBe('quarterly');

  store.setFileFilter();

  expect(store.selectedFilePath).toBeUndefined();
});
