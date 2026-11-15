import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('advanceRepeater_clampsToLastDayOfFeb_whenMonthlyFrom0131', () => {
  const next = editOrgDocument(
    '* TODO Monthly\nSCHEDULED: <2026-01-31 Sat +1m>\n',
    (doc) => {
      doc
        .headlineAt(0)
        ?.scheduled.advanceRepeater(new Date(2026, 0, 31, 12, 0));
    }
  );
  expect(next).toBe('* TODO Monthly\nSCHEDULED: <2026-02-28 Sat +1m>\n');
});

test('advanceRepeater_advancesWithoutClamp_whenMonthlyFrom0115', () => {
  const next = editOrgDocument(
    '* TODO Monthly\nSCHEDULED: <2026-01-15 Thu +1m>\n',
    (doc) => {
      doc
        .headlineAt(0)
        ?.scheduled.advanceRepeater(new Date(2026, 0, 15, 12, 0));
    }
  );
  expect(next).toBe('* TODO Monthly\nSCHEDULED: <2026-02-15 Sun +1m>\n');
});

test('advanceRepeater_clampsToLastDayOfFeb_whenLeapYearPlus1y', () => {
  const next = editOrgDocument(
    '* TODO Yearly\nSCHEDULED: <2024-02-29 Thu +1y>\n',
    (doc) => {
      doc
        .headlineAt(0)
        ?.scheduled.advanceRepeater(new Date(2024, 1, 29, 12, 0));
    }
  );
  expect(next).toBe('* TODO Yearly\nSCHEDULED: <2025-02-28 Fri +1y>\n');
});

test('advanceRepeater_advancesWithoutClamp_whenYearlyFrom0615', () => {
  const next = editOrgDocument(
    '* TODO Yearly\nSCHEDULED: <2024-06-15 Sat +1y>\n',
    (doc) => {
      doc
        .headlineAt(0)
        ?.scheduled.advanceRepeater(new Date(2024, 5, 15, 12, 0));
    }
  );
  expect(next).toBe('* TODO Yearly\nSCHEDULED: <2025-06-15 Sun +1y>\n');
});

test('todoKeyword_reflectsAst_afterSetTodoKeyword', () => {
  editOrgDocument('* TODO Task\n', (doc) => {
    const h = doc.headlineAt(0);
    expect(h?.todoKeyword).toBe('TODO');
    h?.setTodoKeyword('DONE');
    expect(h?.todoKeyword).toBe('DONE');
  });
});

test('text_returnsRealTitleBody_notPlaceholder', () => {
  editOrgDocument('* TODO [#A] Real title :work:\n', (doc) => {
    expect(doc.headlineAt(0)?.text).toBe('Real title');
  });
});

test('priority_returnsPriorityLetter_whenSet', () => {
  editOrgDocument('* TODO [#A] Task\n', (doc) => {
    expect(doc.headlineAt(0)?.priority).toBe('A');
  });
  editOrgDocument('* TODO Task\n', (doc) => {
    expect(doc.headlineAt(0)?.priority).toBeUndefined();
  });
});

test('tags_returnsParsedTagsArray', () => {
  editOrgDocument('* TODO Task :work:project:\n', (doc) => {
    expect(doc.headlineAt(0)?.tags).toEqual(['work', 'project']);
  });
  editOrgDocument('* TODO Task\n', (doc) => {
    expect(doc.headlineAt(0)?.tags).toEqual([]);
  });
});

test('body_returnsText_afterPlanningAndPropertyDrawer', () => {
  editOrgDocument(
    '* TODO Task\nSCHEDULED: <2026-05-13 Wed>\n:PROPERTIES:\n:STYLE: habit\n:END:\nLine 1\nLine 2\n',
    (doc) => {
      expect(doc.headlineAt(0)?.body).toBe('Line 1\nLine 2');
    }
  );
});

test('body_isEmpty_whenNoBodyContent', () => {
  editOrgDocument('* TODO Task\n', (doc) => {
    expect(doc.headlineAt(0)?.body).toBe('');
  });
});

test('text_reflectsMutation_afterSetTitle', () => {
  editOrgDocument('* TODO Old\n', (doc) => {
    const h = doc.headlineAt(0);
    h?.setTitle('Renamed');
    expect(h?.text).toBe('Renamed');
  });
});

test('detachNode_parsedSnippetChild_canBeReattachedAfterDetach', async () => {
  const { detachNode } = await import('../shared/detach-node');
  const { parse, NodeType } = await import('org-mode-ast');
  const parent = parse('* X\nA\n');
  const snippet = parse('* X\nB\n');
  const headline = snippet.childrenList.find((n) => n.is(NodeType.Headline));
  const text = headline?.section?.childrenList.find((n) => n.is(NodeType.Text));
  if (!text) throw new Error('test setup');
  headline?.section?.removeNode(text);
  detachNode(text);
  const parentSection = parent.childrenList.find((n) =>
    n.is(NodeType.Headline)
  )?.section;
  parentSection?.addChild(text);
  expect(parent.rawValue).toBe('* X\nA\nB');
});
