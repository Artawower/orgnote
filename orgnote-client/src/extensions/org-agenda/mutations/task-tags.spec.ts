import { expect, test } from 'vitest';
import { changeTaskTags } from './task-tags';

test('changeTaskTags_setsTags_onHeadlineWithoutTags', () => {
  expect(changeTaskTags('* TODO My task', 0, ['work', 'home'])).toBe('* TODO My task :work:home:');
});

test('changeTaskTags_replacesTags_whenTagsAlreadyExist', () => {
  expect(changeTaskTags('* TODO My task :old:', 0, ['new'])).toBe('* TODO My task :new:');
});

test('changeTaskTags_removesTags_whenEmptyArray', () => {
  expect(changeTaskTags('* TODO My task :work:', 0, [])).toBe('* TODO My task');
});

test('changeTaskTags_preservesPriority_whenChangingTags', () => {
  expect(changeTaskTags('* TODO [#A] My task :old:', 0, ['new'])).toBe('* TODO [#A] My task :new:');
});

test('changeTaskTags_onlyModifiesTargetHeadline_withOffset', () => {
  const content = '* TODO First :a:\n* TODO Second :b:';
  const secondStart = content.indexOf('* TODO Second');
  expect(changeTaskTags(content, secondStart, ['c'])).toBe('* TODO First :a:\n* TODO Second :c:');
});

test('changeTaskTags_setsTags_onNestedHeadline', () => {
  const prefix = '* Root\n\n';
  const content = `${prefix}** TODO My nested task`;
  const headlineStart = prefix.length;
  expect(changeTaskTags(content, headlineStart, ['work', 'urgent']))
    .toBe(`${prefix}** TODO My nested task :work:urgent:`);
});

test('changeTaskTags_replacesTags_onNestedHeadline', () => {
  const prefix = '* Root\n\n';
  const content = `${prefix}** TODO My task :old:`;
  const headlineStart = prefix.length;
  expect(changeTaskTags(content, headlineStart, ['new']))
    .toBe(`${prefix}** TODO My task :new:`);
});
