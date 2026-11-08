import { expect, test, vi } from 'vitest';
import {
  createTemplatePath,
  DEFAULT_TEMPLATE_CONTENT,
  DEFAULT_TEMPLATE_PATH,
  ensureDefaultTemplate,
  isOrgTemplatePath,
  templateTitleFromPath,
} from './template-paths';

test('createTemplatePath appends template extension inside templates root', () => {
  expect(createTemplatePath('Daily Note')).toBe('/.orgnote/templates/Daily Note.org.tmpl');
});

test('createTemplatePath keeps existing template extension', () => {
  expect(createTemplatePath('daily.org.tmpl')).toBe('/.orgnote/templates/daily.org.tmpl');
});

test('isOrgTemplatePath accepts only direct org template files', () => {
  expect(isOrgTemplatePath('/.orgnote/templates/daily.org.tmpl')).toBe(true);
  expect(isOrgTemplatePath('/.orgnote/templates/work/daily.org.tmpl')).toBe(false);
  expect(isOrgTemplatePath('/.orgnote/templates/daily.org')).toBe(false);
});

test('templateTitleFromPath removes org template extension', () => {
  expect(templateTitleFromPath('/.orgnote/templates/Daily Note.org.tmpl')).toBe('Daily Note');
});

test('DEFAULT_TEMPLATE_PATH points to direct default template file', () => {
  expect(DEFAULT_TEMPLATE_PATH).toBe('/.orgnote/templates/default.org.tmpl');
  expect(isOrgTemplatePath(DEFAULT_TEMPLATE_PATH)).toBe(true);
});

test('DEFAULT_TEMPLATE_CONTENT contains id and title placeholders', () => {
  expect(DEFAULT_TEMPLATE_CONTENT).toBe(':PROPERTIES:\n:ID: {{uuid()}}\n:END:\n#+TITLE: {{title}}\n');
});

test('ensureDefaultTemplate creates default template with initial content', async () => {
  const fileInfo = vi.fn()
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ type: 'directory' })
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ type: 'file' });
  const mkdir = vi.fn().mockResolvedValue(undefined);
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const api = {
    core: {
      useFileSystem: () => ({
        fileInfo,
        mkdir,
        readFile: vi.fn(),
        writeFile,
      }),
    },
  } as never;

  const result = await ensureDefaultTemplate(api);

  expect(result).toBe(true);
  expect(mkdir).toHaveBeenCalledWith('/.orgnote/templates');
  expect(writeFile).toHaveBeenCalledWith(DEFAULT_TEMPLATE_PATH, DEFAULT_TEMPLATE_CONTENT);
});
