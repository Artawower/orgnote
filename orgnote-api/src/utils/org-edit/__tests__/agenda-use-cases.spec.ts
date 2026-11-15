import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

const NOW = new Date(2026, 4, 13, 10, 53);

test('completeTask_changesTodoToDone_withClosedAndLogbook', () => {
  const next = editOrgDocument('* TODO Task\nBody\n', (doc) => {
    const h = doc.headlineAt(0);
    if (!h) return;
    h.setTodoKeyword('DONE');
    h.closed.set(NOW);
    h.logbook.appendStateChange({ from: 'TODO', to: 'DONE', at: NOW });
  });
  expect(next).toBe(
    '* DONE Task\nCLOSED: [2026-05-13 Wed 10:53]\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\nBody\n'
  );
});

test('completeRepeatingTask_keepsKeyword_advancesScheduledAndLogsStateChange', () => {
  const next = editOrgDocument(
    '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n',
    (doc) => {
      const h = doc.headlineAt(0);
      if (!h) return;
      h.setTodoKeyword('TODO');
      h.scheduled.advanceRepeater(NOW);
      h.logbook.appendStateChange({ from: 'TODO', to: 'DONE', at: NOW });
    }
  );
  expect(next).toBe(
    '* TODO Daily\nSCHEDULED: <2026-05-14 Thu +1d>\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n:END:\n'
  );
});

test('reopenTask_changesDoneToTodo_removesClosedAndLogsStateChange', () => {
  const next = editOrgDocument(
    '* DONE Task\nCLOSED: [2026-05-13 Wed 10:00]\n',
    (doc) => {
      const h = doc.headlineAt(0);
      if (!h) return;
      h.setTodoKeyword('TODO');
      h.closed.clear();
      h.logbook.appendStateChange({ from: 'DONE', to: 'TODO', at: NOW });
    }
  );
  expect(next).toBe(
    '* TODO Task\n:LOGBOOK:\n- State "TODO" from "DONE" [2026-05-13 Wed 10:53]\n:END:\n'
  );
});

test('undoRecurringCompletion_removesSingleLogbookStateChangeLine', () => {
  const next = editOrgDocument(
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-13 Wed 10:53]\n- State "DONE" from "TODO" [2026-05-12 Tue 09:00]\n:END:\n',
    (doc) => {
      doc
        .headlineAt(0)
        ?.logbook.removeStateChange({ to: 'DONE', date: '2026-05-13' });
    }
  );
  expect(next).toBe(
    '* TODO Task\n:LOGBOOK:\n- State "DONE" from "TODO" [2026-05-12 Tue 09:00]\n:END:\n'
  );
});

test('completeHabit_resetsKeyword_advancesScheduledAndAppendsClock', () => {
  const next = editOrgDocument(
    '* TODO Meditate\nSCHEDULED: <2026-05-13 Wed +1d>\n',
    (doc) => {
      const h = doc.headlineAt(0);
      if (!h) return;
      h.setTodoKeyword('TODO');
      h.scheduled.advanceRepeater(NOW);
      h.logbook.appendClock({ start: NOW, end: NOW });
    }
  );
  expect(next).toBe(
    '* TODO Meditate\nSCHEDULED: <2026-05-14 Thu +1d>\n:LOGBOOK:\nCLOCK: [2026-05-13 Wed 10:53]--[2026-05-13 Wed 10:53] =>  0:00\n:END:\n'
  );
});

test('openClock_closeClock_cycle', () => {
  const opened = editOrgDocument('* TODO Task\n', (doc) =>
    doc.headlineAt(0)?.logbook.openClock(new Date(2026, 4, 13, 10, 0))
  );
  expect(opened).toBe(
    '* TODO Task\n:LOGBOOK:\nCLOCK: [2026-05-13 Wed 10:00]\n:END:\n'
  );

  const closed = editOrgDocument(opened, (doc) =>
    doc.headlineAt(0)?.logbook.closeClock({
      start: new Date(2026, 4, 13, 10, 0),
      end: new Date(2026, 4, 13, 10, 30),
    })
  );
  expect(closed).toBe(
    '* TODO Task\n:LOGBOOK:\nCLOCK: [2026-05-13 Wed 10:00]--[2026-05-13 Wed 10:30] =>  0:30\n:END:\n'
  );
});

test('changeTaskTitle_changeTaskStatus_changeTaskBody', () => {
  const titled = editOrgDocument('* TODO Old\nBody\n', (doc) =>
    doc.headlineAt(0)?.setTitle('New')
  );
  expect(titled).toBe('* TODO New\nBody\n');

  const statused = editOrgDocument('* TODO Task\n', (doc) =>
    doc.headlineAt(0)?.setTodoKeyword('NEXT')
  );
  expect(statused).toBe('* NEXT Task\n');

  const bodied = editOrgDocument('* TODO Task\nOld body\n', (doc) =>
    doc.headlineAt(0)?.setBody('New body')
  );
  expect(bodied).toBe('* TODO Task\nNew body\n');
});

test('remove_singleHeadline_returnsEmptyDocument', () => {
  const result = editOrgDocument('* TODO Buy milk\n', (doc) =>
    doc.headlineAt(0)?.remove()
  );
  expect(result).not.toContain('Buy milk');
});

test('remove_firstHeadline_keepsSecond', () => {
  const result = editOrgDocument('* TODO Buy milk\n* TODO Walk dog\n', (doc) =>
    doc.headlineAt(0)?.remove()
  );
  expect(result).not.toContain('Buy milk');
  expect(result).toContain('Walk dog');
});

test('remove_missingHeadline_returnsOriginal', () => {
  const result = editOrgDocument('* TODO Buy milk\n', (doc) => doc.headlineAt(999)?.remove());
  expect(result).toContain('Buy milk');
});
