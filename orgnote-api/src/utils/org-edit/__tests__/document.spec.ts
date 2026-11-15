import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('headlineAt_returnsHeadline_whenOffsetInsideIt', () => {
  const content = '* TODO Task A\nBody A\n** TODO Child\n* TODO Task B\n';
  editOrgDocument(content, (doc) => {
    const a = doc.headlineAt(0);
    const child = doc.headlineAt(content.indexOf('** TODO Child'));
    const b = doc.headlineAt(content.indexOf('* TODO Task B'));

    expect(a?.todoKeyword).toBe('TODO');
    expect(a?.level).toBe(1);
    expect(child?.todoKeyword).toBe('TODO');
    expect(child?.level).toBe(2);
    expect(b?.todoKeyword).toBe('TODO');
    expect(b?.level).toBe(1);
  });
});

test('headlineAt_returnsUndefined_whenOffsetOutsideAnyHeadline', () => {
  const content = '\n\nNo headlines here\n';
  editOrgDocument(content, (doc) => {
    expect(doc.headlineAt(0)).toBeUndefined();
    expect(doc.headlineAt(content.length - 1)).toBeUndefined();
  });
});

test('headlines_returnsAllHeadlines_topLevelAndNested', () => {
  const content = '* A\n** A1\n** A2\n* B\n';
  editOrgDocument(content, (doc) => {
    const headlines = doc.headlines();
    expect(headlines.map((h) => h.level)).toEqual([1, 2, 2, 1]);
  });
});

test('findHeadline_returnsFirstMatch_byPredicate', () => {
  const content = '* TODO A\n* DONE B\n* TODO C\n';
  editOrgDocument(content, (doc) => {
    const done = doc.findHeadline((h) => h.todoKeyword === 'DONE');
    expect(done?.todoKeyword).toBe('DONE');
  });
});
