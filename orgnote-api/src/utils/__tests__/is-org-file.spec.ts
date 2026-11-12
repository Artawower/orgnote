import { test, expect } from 'vitest';
import { isOrgFile, isOrgGpgFile } from '../is-org-file';

test('Should return true for org files', () => {
  const files = [
    'myNote.org',
    'my_note.org',
    '123.org',
    'some_long_note#4123$123eqasdasd.org.gpg',
    'some_long_note#4123$123eqasdasd.org',
    'note with space.org',
    'note with space.org.gpg',
  ];

  files.forEach((file) => {
    expect(isOrgFile(file), file).toBe(true);
  });
});

test('Should not return true for non-org files', () => {
  const files = [
    'myNote.md',
    'my_note.md',
    '123.md',
    'some_long_note#4123$123eqasdas',
    'note.org.file',
    'org',
    'org.',
    'text.gpg',
  ];

  files.forEach((file) => {
    expect(isOrgFile(file), file).toBe(false);
  });
});

test('Should return true for org.gpg files', () => {
  const gpgFiles = [
    'myNote.org.gpg',
    'my_note.org.gpg',
    '123.org.gpg',
    'org.org.gpg',
    'gp_org.org.gpg',
  ];

  gpgFiles.forEach((file) => {
    expect(isOrgGpgFile(file), file).toBe(true);
  });
});

test('Should not return true for not .org.gpg files', () => {
  const notGpgFiles = [
    'myNote.org',
    'my_note.org',
    '123.org',
    'some_gpg_file.txt',
  ];

  notGpgFiles.forEach((file) => {
    expect(isOrgGpgFile(file), file).toBe(false);
  });
});
