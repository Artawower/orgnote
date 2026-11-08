import { expect, test } from 'vitest';
import { toggleTaskInContent } from './task-toggle';

test('toggleTaskInContent toggles list checkbox from todo to done', () => {
  const content = '- [ ] Buy milk';

  const updated = toggleTaskInContent(content, {
    taskKind: 'list-checkbox',
    start: 0,
  });

  expect(updated).toBe('- [X] Buy milk');
});

test('toggleTaskInContent toggles headline checkbox from done to todo', () => {
  const content = '* [X] Ship release';

  const updated = toggleTaskInContent(content, {
    taskKind: 'headline-checkbox',
    start: 0,
  });

  expect(updated).toBe('* [ ] Ship release');
});

test('toggleTaskInContent toggles TODO keyword to DONE', () => {
  const content = '* TODO Prepare report';

  const updated = toggleTaskInContent(content, {
    taskKind: 'headline-todo',
    start: 0,
  });

  expect(updated).toBe('* DONE Prepare report');
});

test('toggleTaskInContent toggles DONE keyword to TODO', () => {
  const content = '* DONE Prepare report';

  const updated = toggleTaskInContent(content, {
    taskKind: 'headline-todo',
    start: 0,
  });

  expect(updated).toBe('* TODO Prepare report');
});

test('toggleTaskInContent toggles DONE keyword to first configured todo keyword', () => {
  const content = ['#+TODO: WAIT TODO | DONE', '* DONE Prepare report'].join('\n');

  const updated = toggleTaskInContent(content, {
    taskKind: 'headline-todo',
    start: content.indexOf('* DONE'),
  });

  expect(updated).toBe(['#+TODO: WAIT TODO | DONE', '* WAIT Prepare report'].join('\n'));
});

test('toggleTaskInContent strips TODO keyword metadata suffixes', () => {
  const content = ['#+TODO: TODO(t) WAIT(w) | DONE(d)', '* DONE Prepare report'].join('\n');

  const updated = toggleTaskInContent(content, {
    taskKind: 'headline-todo',
    start: content.indexOf('* DONE'),
  });

  expect(updated).toBe(['#+TODO: TODO(t) WAIT(w) | DONE(d)', '* TODO Prepare report'].join('\n'));
});

test('toggleTaskInContent returns undefined when token is not found on line', () => {
  const content = '* Task without token';

  const updated = toggleTaskInContent(content, {
    taskKind: 'headline-todo',
    start: 0,
  });

  expect(updated).toBeUndefined();
});

test('toggleTaskInContent changes only the target line by start position', () => {
  const content = ['* TODO First', '* TODO Second'].join('\n');

  const updated = toggleTaskInContent(content, {
    taskKind: 'headline-todo',
    start: content.indexOf('* TODO Second'),
  });

  expect(updated).toBe(['* TODO First', '* DONE Second'].join('\n'));
});

test('toggleTaskInContent toggles nested headline inside section', () => {
  const content = '* TODO Parent\nSome text\n** TODO Child\n';

  const updated = toggleTaskInContent(content, {
    taskKind: 'headline-todo',
    start: content.indexOf('** TODO Child'),
  });

  expect(updated).toBe('* TODO Parent\nSome text\n** DONE Child\n');
});

test('toggleTaskInContent toggles list item nested inside headline section', () => {
  const content = '* Parent\nSome text\n- [ ] Nested item\n';

  const updated = toggleTaskInContent(content, {
    taskKind: 'list-checkbox',
    start: content.indexOf('- [ ]'),
  });

  expect(updated).toBe('* Parent\nSome text\n- [X] Nested item\n');
});
