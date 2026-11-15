import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('setLevel_promotesLevel1ToLevel2', () => {
  const result = editOrgDocument('* TODO Task\n', (doc) => {
    doc.headlineAt(0)?.setLevel(2);
  });
  expect(result).toBe('** TODO Task\n');
});

test('setLevel_demotesLevel3ToLevel2', () => {
  const result = editOrgDocument('*** TODO Task\n', (doc) => {
    doc.headlineAt(0)?.setLevel(2);
  });
  expect(result).toBe('** TODO Task\n');
});

test('setLevel_isNoOp_whenSameLevel', () => {
  const original = '** Existing\n';
  const result = editOrgDocument(original, (doc) => {
    doc.headlineAt(0)?.setLevel(2);
  });
  expect(result).toBe(original);
});

test('setLevel_throws_forZero', () => {
  expect(() => {
    editOrgDocument('* Task\n', (doc) => {
      doc.headlineAt(0)?.setLevel(0);
    });
  }).toThrow(/must be/);
});

test('setLevel_throws_forNegative', () => {
  expect(() => {
    editOrgDocument('* Task\n', (doc) => {
      doc.headlineAt(0)?.setLevel(-1);
    });
  }).toThrow(/must be/);
});

test('setLevel_preservesTitleTodoKeywordAndTags', () => {
  const result = editOrgDocument(
    '* TODO [#A] My title :work:home:\n',
    (doc) => {
      doc.headlineAt(0)?.setLevel(3);
    }
  );
  expect(result).toBe('*** TODO [#A] My title :work:home:\n');
});

test('setLevel_roundtripsContent', () => {
  const original = '* Header\n\nBody paragraph.\n';
  const result = editOrgDocument(original, (doc) => {
    doc.headlineAt(0)?.setLevel(2);
    doc.headlineAt(0)?.setLevel(1);
  });
  expect(result).toBe(original);
});

test('setLevel_updatesLevelProperty', () => {
  let capturedLevel = -1;
  editOrgDocument('* Task\n', (doc) => {
    const h = doc.headlineAt(0)!;
    h.setLevel(3);
    capturedLevel = h.level;
  });
  expect(capturedLevel).toBe(3);
});

test('setLevel_onlyShiftsTargetHeadline_notSiblings', () => {
  const result = editOrgDocument('* A\n* B\n', (doc) => {
    doc.headlineAt(0)?.setLevel(3);
  });
  expect(result).toBe('*** A\n* B\n');
});
