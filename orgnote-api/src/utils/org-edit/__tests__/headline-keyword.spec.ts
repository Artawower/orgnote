import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('setTodoKeyword_changesKeyword_fromTodoToDone', () => {
  const next = editOrgDocument('* TODO Task\n', (doc) => {
    doc.headlineAt(0)?.setTodoKeyword('DONE');
  });
  expect(next).toBe('* DONE Task\n');
});

test('setTodoKeyword_changesKeyword_toShorterKeyword', () => {
  const next = editOrgDocument('* TODO Task\nBody\n', (doc) => {
    doc.headlineAt(0)?.setTodoKeyword('NEXT');
  });
  expect(next).toBe('* NEXT Task\nBody\n');
});

test('setTodoKeyword_shiftsNeighbourPositions_whenLongerKeyword', () => {
  const next = editOrgDocument('* TODO Task\n** TODO Child\n', (doc) => {
    doc.headlineAt(0)?.setTodoKeyword('IN-PROGRESS');
  });
  expect(next).toBe('* IN-PROGRESS Task\n** TODO Child\n');
});

test('setTodoKeyword_appliesMultipleChanges_withinOneMutate', () => {
  const content = '* TODO A\n* TODO B\n';
  const next = editOrgDocument(content, (doc) => {
    doc.headlineAt(0)?.setTodoKeyword('DONE');
    doc.headlineAt(content.indexOf('* TODO B'))?.setTodoKeyword('DONE');
  });
  expect(next).toBe('* DONE A\n* DONE B\n');
});
