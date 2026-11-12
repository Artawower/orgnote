import { beforeEach, expect, test, vi } from 'vitest';
import { renderOrgTemplate } from './template-renderer';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 26, 12, 34, 56, 789));
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000');
});

test('renderOrgTemplate replaces note context placeholders', () => {
  const result = renderOrgTemplate(
    '#+TITLE: {{ title }}\n#+FILE: {{fileName}}\n#+DIR: {{ directory }}\n#+PATH: {{path}}',
    '/notes/my-project.org',
  );

  expect(result).toBe(
    '#+TITLE: My Project\n#+FILE: my-project.org\n#+DIR: /notes\n#+PATH: /notes/my-project.org',
  );
});

test('renderOrgTemplate replaces zero argument helpers', () => {
  const result = renderOrgTemplate(
    ':ID: {{ uuid() }}\n#+DATE: {{date()}}\n#+ISO: {{ isoDate() }}\n#+TS: {{timestamp()}}',
    '/daily.org',
  );

  expect(result).toContain(':ID: 00000000-0000-4000-8000-000000000000');
  expect(result).toContain('#+DATE: <2026-06-26 Fri>');
  expect(result).toContain('#+ISO: 2026-06-26');
  expect(result).toContain('#+TS:');
});

test('renderOrgTemplate replaces unsupported expressions with empty strings', () => {
  const result = renderOrgTemplate('{{unknown}} {{title()}} {{uuid}}', '/note.org');

  expect(result).toBe('  ');
});
