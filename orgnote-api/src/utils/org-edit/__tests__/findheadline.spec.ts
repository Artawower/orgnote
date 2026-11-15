import { expect, test, vi } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('findHeadline_invokesPredicateOnce_perHeadlineUpToMatch', () => {
  const content = '* TODO A\n* TODO B\n* DONE C\n* TODO D\n';
  const predicate = vi.fn(
    (h: { todoKeyword?: string }) => h.todoKeyword === 'DONE'
  );

  editOrgDocument(content, (doc) => {
    const found = doc.findHeadline(predicate);
    expect(found?.todoKeyword).toBe('DONE');
  });

  expect(predicate).toHaveBeenCalledTimes(3);
});

test('findHeadline_returnsUndefined_whenNothingMatches', () => {
  const content = '* TODO A\n* TODO B\n';
  const predicate = vi.fn(() => false);

  editOrgDocument(content, (doc) => {
    expect(doc.findHeadline(predicate)).toBeUndefined();
  });

  expect(predicate).toHaveBeenCalledTimes(2);
});
