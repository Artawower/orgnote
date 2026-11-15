import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadTextFile } from './download-text-file';

let mockAnchor: HTMLAnchorElement;

beforeEach(() => {
  mockAnchor = document.createElement('a');
  vi.spyOn(document, 'createElement').mockImplementation(
    ((tagName: string) => {
      if (tagName === 'a') {
        return mockAnchor;
      }
      return document.createElement(tagName);
    }) as typeof document.createElement,
  );
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:test-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('downloadTextFile creates blob with correct MIME type', () => {
  downloadTextFile('test.txt', 'hello');
  const spy = vi.mocked(URL.createObjectURL);
  expect(spy).toHaveBeenCalled();
  const blobArg = spy.mock.calls[0]?.[0] as Blob | undefined;
  expect(blobArg?.type).toBe('text/plain;charset=utf-8');
});

test('downloadTextFile creates blob with correct content size', () => {
  const content = 'hello world';
  downloadTextFile('test.txt', content);
  const spy = vi.mocked(URL.createObjectURL);
  const blobArg = spy.mock.calls[0]?.[0] as Blob | undefined;
  expect(blobArg?.size).toBe(content.length);
});

test('downloadTextFile creates anchor element with correct tag', () => {
  downloadTextFile('myfile.txt', 'content');
  const spy = vi.mocked(document.createElement);
  expect(spy).toHaveBeenCalledWith('a');
});

test('downloadTextFile sets anchor href to blob URL', () => {
  downloadTextFile('myfile.txt', 'content');
  expect(mockAnchor.href).toBe('blob:test-url');
});

test('downloadTextFile sets anchor download attribute to filename', () => {
  downloadTextFile('myfile.txt', 'content');
  expect(mockAnchor.download).toBe('myfile.txt');
});

test('downloadTextFile appends anchor to document body', () => {
  const appendSpy = vi.spyOn(document.body, 'appendChild');
  downloadTextFile('test.txt', 'content');
  expect(appendSpy).toHaveBeenCalled();
});

test('downloadTextFile clicks anchor to trigger download', () => {
  const clickSpy = vi.spyOn(mockAnchor, 'click');
  downloadTextFile('test.txt', 'content');
  expect(clickSpy).toHaveBeenCalled();
});

test('downloadTextFile removes anchor from document body after click', () => {
  const removeSpy = vi.spyOn(document.body, 'removeChild');
  downloadTextFile('test.txt', 'content');
  expect(removeSpy).toHaveBeenCalled();
});

test('downloadTextFile revokes object URL after download', () => {
  downloadTextFile('test.txt', 'content');
  const spy = vi.mocked(URL.revokeObjectURL);
  expect(spy).toHaveBeenCalledWith('blob:test-url');
});

test('downloadTextFile handles empty string content', () => {
  expect(() => downloadTextFile('empty.txt', '')).not.toThrow();
});

test('downloadTextFile handles unicode content', () => {
  expect(() => downloadTextFile('unicode.txt', 'Привет Мир 🌍')).not.toThrow();
});


