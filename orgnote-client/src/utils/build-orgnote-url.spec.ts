import { expect, test, vi, beforeEach } from 'vitest';
import { buildOrgNoteUrl } from './build-orgnote-url';

beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'https://org-note.com' } });
});

test('buildOrgNoteUrl returns web url by default', () => {
  expect(buildOrgNoteUrl('auth/login')).toBe('https://org-note.com/auth/login');
});

test('buildOrgNoteUrl returns web url when target is web', () => {
  expect(buildOrgNoteUrl('auth/login', { target: 'web' })).toBe('https://org-note.com/auth/login');
});

test('buildOrgNoteUrl returns native-app url when target is native-app', () => {
  expect(buildOrgNoteUrl('auth/login', { target: 'native-app' })).toBe('orgnote://auth/login');
});

test('buildOrgNoteUrl normalizes leading slash for web target', () => {
  expect(buildOrgNoteUrl('/notes/view')).toBe('https://org-note.com/notes/view');
});

test('buildOrgNoteUrl normalizes leading slash for native-app target', () => {
  expect(buildOrgNoteUrl('/auth/login', { target: 'native-app' })).toBe('orgnote://auth/login');
});

test('buildOrgNoteUrl appends query parameters for native-app', () => {
  const url = buildOrgNoteUrl('auth/login', {
    target: 'native-app',
    query: { token: 'abc123', state: 'xyz' },
  });
  expect(url).toBe('orgnote://auth/login?token=abc123&state=xyz');
});

test('buildOrgNoteUrl appends query parameters for web', () => {
  const url = buildOrgNoteUrl('auth/login', {
    target: 'web',
    query: { token: 'abc123' },
  });
  expect(url).toBe('https://org-note.com/auth/login?token=abc123');
});

test('buildOrgNoteUrl ignores empty query object', () => {
  expect(buildOrgNoteUrl('notes/view', { query: {} })).toBe('https://org-note.com/notes/view');
});

test('buildOrgNoteUrl ignores undefined query', () => {
  expect(buildOrgNoteUrl('notes/view', { target: 'native-app', query: undefined })).toBe(
    'orgnote://notes/view'
  );
});

test('buildOrgNoteUrl encodes special characters in query values', () => {
  const url = buildOrgNoteUrl('search', { query: { q: 'hello world' } });
  expect(url).toBe('https://org-note.com/search?q=hello+world');
});

test('buildOrgNoteUrl encodes special characters in query keys', () => {
  const url = buildOrgNoteUrl('search', { query: { 'special key': 'value' } });
  expect(url).toBe('https://org-note.com/search?special+key=value');
});

test('buildOrgNoteUrl handles multiple query parameters', () => {
  const url = buildOrgNoteUrl('notes', {
    query: { id: '123', mode: 'edit', lang: 'en' },
  });
  expect(url).toBe('https://org-note.com/notes?id=123&mode=edit&lang=en');
});

test('buildOrgNoteUrl handles nested path segments', () => {
  expect(buildOrgNoteUrl('api/v1/notes/123')).toBe('https://org-note.com/api/v1/notes/123');
});

test('buildOrgNoteUrl handles empty path', () => {
  expect(buildOrgNoteUrl('')).toBe('https://org-note.com/');
});

test('buildOrgNoteUrl handles empty path for native-app', () => {
  expect(buildOrgNoteUrl('', { target: 'native-app' })).toBe('orgnote://');
});

test('buildOrgNoteUrl handles options with only query', () => {
  const url = buildOrgNoteUrl('notes', { query: { page: '1' } });
  expect(url).toBe('https://org-note.com/notes?page=1');
});

test('buildOrgNoteUrl handles options with only target', () => {
  expect(buildOrgNoteUrl('notes', { target: 'native-app' })).toBe('orgnote://notes');
});
