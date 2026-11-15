import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('appendStateChange_createsLogbookDrawer_whenNoneExists', () => {
  const next = editOrgDocument('* TODO Task\nBody\n', (doc) => {
    doc.headlineAt(0)?.logbook.appendStateChange({
      from: 'TODO',
      to: 'DONE',
      at: new Date(2026, 4, 13, 10, 53),
    });
  });
  expect(next).toBe(
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\nBody\n'
  );
});

test('appendStateChange_insertsDrawer_afterPlanningLine', () => {
  const next = editOrgDocument(
    '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\nBody\n',
    (doc) => {
      doc.headlineAt(0)?.logbook.appendStateChange({
        from: 'TODO',
        to: 'DONE',
        at: new Date(2026, 4, 13, 10, 53),
      });
    }
  );
  expect(next).toBe(
    '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\nBody\n'
  );
});

test('appendStateChange_insertsDrawer_afterPropertyDrawer', () => {
  const next = editOrgDocument(
    '* TODO Habit\n:PROPERTIES:\n:STYLE: habit\n:END:\nBody\n',
    (doc) => {
      doc.headlineAt(0)?.logbook.appendStateChange({
        from: 'TODO',
        to: 'DONE',
        at: new Date(2026, 4, 13, 10, 53),
      });
    }
  );
  expect(next).toBe(
    '* TODO Habit\n:PROPERTIES:\n:STYLE: habit\n:END:\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\nBody\n'
  );
});

test('appendStateChange_separatesDrawerAfterPropertyDrawerAtEndOfFile', () => {
  const next = editOrgDocument(
    '* TODO Habit\n:PROPERTIES:\n:STYLE: habit\n:END:',
    (doc) => {
      doc.headlineAt(0)?.logbook.appendStateChange({
        from: 'TODO',
        to: 'DONE',
        at: new Date(2026, 4, 13, 10, 53),
      });
    }
  );
  expect(next).toBe(
    '* TODO Habit\n:PROPERTIES:\n:STYLE: habit\n:END:\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\n'
  );
});

test('appendStateChange_prependsEntry_toExistingDrawer', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-12 Tue 09:00]\n:END:\n';
  const next = editOrgDocument(content, (doc) => {
    doc.headlineAt(0)?.logbook.appendStateChange({
      from: 'TODO',
      to: 'DONE',
      at: new Date(2026, 4, 13, 10, 53),
    });
  });
  expect(next).toBe(
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n- State "DONE" from "TODO" [2026-05-12 Tue 09:00]\n:END:\n'
  );
});

test('removeStateChange_removesEntry_byDate', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n- State "DONE" from "TODO" [2026-05-12 Tue 09:00]\n:END:\n';
  const next = editOrgDocument(content, (doc) => {
    const removed = doc
      .headlineAt(0)
      ?.logbook.removeStateChange({ to: 'DONE', date: '2026-05-12' });
    expect(removed).toBe(true);
  });
  expect(next).toBe(
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\n'
  );
});

test('removeStateChange_removesEntireDrawer_whenLastEntryRemoved', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\nBody\n';
  const next = editOrgDocument(content, (doc) => {
    const removed = doc
      .headlineAt(0)
      ?.logbook.removeStateChange({ to: 'DONE', date: '2026-05-13' });
    expect(removed).toBe(true);
  });
  expect(next).toBe('* TODO Task\nBody\n');
});

test('removeStateChange_returnsFalse_whenNoMatchingEntry', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\n';
  editOrgDocument(content, (doc) => {
    const removed = doc
      .headlineAt(0)
      ?.logbook.removeStateChange({ to: 'DONE', date: '2026-05-14' });
    expect(removed).toBe(false);
  });
});

test('logbookClear_removesEntireDrawer', () => {
  const content =
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\nBody\n';
  const next = editOrgDocument(content, (doc) => {
    doc.headlineAt(0)?.logbook.clear();
  });
  expect(next).toBe('* TODO Task\nBody\n');
});

test('logbookClear_isNoOp_whenNoDrawer', () => {
  const content = '* TODO Task\nBody\n';
  expect(
    editOrgDocument(content, (doc) => doc.headlineAt(0)?.logbook.clear())
  ).toBe(content);
});

test('appendClock_insertsClosedClockEntry', () => {
  const next = editOrgDocument('* TODO Habit\n', (doc) => {
    doc.headlineAt(0)?.logbook.appendClock({
      start: new Date(2026, 4, 13, 10, 0),
      end: new Date(2026, 4, 13, 10, 30),
    });
  });
  expect(next).toBe(
    '* TODO Habit\n:LOGBOOK:\nCLOCK: [2026-05-13 Wed 10:00]--[2026-05-13 Wed 10:30] =>  0:30\n:END:\n'
  );
});

test('openClock_insertsClockWithNoEnd', () => {
  const next = editOrgDocument('* TODO Habit\n', (doc) => {
    doc.headlineAt(0)?.logbook.openClock(new Date(2026, 4, 13, 10, 0));
  });
  expect(next).toBe(
    '* TODO Habit\n:LOGBOOK:\nCLOCK: [2026-05-13 Wed 10:00]\n:END:\n'
  );
});

test('closeClock_replacesOpenClock_withClosedRange', () => {
  const content =
    '* TODO Habit\n:LOGBOOK:\nCLOCK: [2026-05-13 Wed 10:00]\n:END:\n';
  const next = editOrgDocument(content, (doc) => {
    const closed = doc.headlineAt(0)?.logbook.closeClock({
      start: new Date(2026, 4, 13, 10, 0),
      end: new Date(2026, 4, 13, 10, 30),
    });
    expect(closed).toBe(true);
  });
  expect(next).toBe(
    '* TODO Habit\n:LOGBOOK:\nCLOCK: [2026-05-13 Wed 10:00]--[2026-05-13 Wed 10:30] =>  0:30\n:END:\n'
  );
});

test('closeClock_returnsFalse_whenNoMatchingOpenClock', () => {
  const content =
    '* TODO Habit\n:LOGBOOK:\nCLOCK: [2026-05-13 Wed 10:00]\n:END:\n';
  editOrgDocument(content, (doc) => {
    const closed = doc.headlineAt(0)?.logbook.closeClock({
      start: new Date(2026, 4, 14, 10, 0),
      end: new Date(2026, 4, 14, 10, 30),
    });
    expect(closed).toBe(false);
  });
});

test('logbookEntries_exposesStateChangeEntries', () => {
  editOrgDocument(
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\n',
    (doc) => {
      const entries = doc.headlineAt(0)?.logbook.entries ?? [];
      expect(entries).toHaveLength(1);
      expect(entries[0]?.type).toBe('state-change');
      expect(entries[0]?.fromKeyword).toBe('TODO');
      expect(entries[0]?.toKeyword).toBe('DONE');
    }
  );
});
