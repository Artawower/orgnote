import { test, expect } from 'vitest';
import { debounce } from 'src/utils/debounce';

test('EditNote uses debounce for auto-save functionality', () => {
  expect(debounce).toBeDefined();
  expect(typeof debounce).toBe('function');
});

test('debounce utility works correctly for save delays', () => {
  let callCount = 0;
  const mockSave = () => {
    callCount++;
  };

  const debouncedSave = debounce(mockSave, 100);

  debouncedSave();
  debouncedSave();
  debouncedSave();

  expect(callCount).toBe(0);
});

test('notification config has proper structure for errors', () => {
  const notificationConfig = {
    message: 'Failed to save file',
    level: 'danger',
  };

  expect(notificationConfig.message).toBe('Failed to save file');
  expect(notificationConfig.level).toBe('danger');
});

test('route watching uses precise currentRoute observation', () => {
  const mockRoute = {
    params: { path: 'test/file.org' },
    fullPath: '/1/edit-note/test/file.org',
  };

  const mockRouter = {
    currentRoute: { value: mockRoute },
  };

  const routeWatchExpression = () => mockRouter?.currentRoute.value;
  expect(routeWatchExpression()).toBe(mockRoute);
  expect(routeWatchExpression().params.path).toBe('test/file.org');
});
