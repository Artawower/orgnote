import { expect, test } from 'vitest';
import { editOrgDocument } from '../edit-org-document';

test('scheduledRead_returnsDateAndRepeater_whenPresent', () => {
  editOrgDocument('* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n', (doc) => {
    const h = doc.headlineAt(0);
    expect(h?.scheduled.value?.date).toBe('2026-05-13');
    expect(h?.scheduled.value?.active).toBe(true);
    expect(h?.scheduled.value?.repeater?.type).toBe('+');
    expect(h?.scheduled.value?.repeater?.value).toBe(1);
    expect(h?.scheduled.value?.repeater?.unit).toBe('d');
  });
});

test('closedRead_returnsInactiveTimestamp_withTime', () => {
  editOrgDocument('* DONE Task\nCLOSED: [2026-05-13 Wed 10:00]\n', (doc) => {
    const h = doc.headlineAt(0);
    expect(h?.closed.value?.date).toBe('2026-05-13T10:00');
    expect(h?.closed.value?.hasTime).toBe(true);
    expect(h?.closed.value?.active).toBe(false);
  });
});

test('planningValue_isUndefined_whenSlotAbsent', () => {
  editOrgDocument('* TODO Task\n', (doc) => {
    const h = doc.headlineAt(0);
    expect(h?.scheduled.value).toBeUndefined();
    expect(h?.deadline.value).toBeUndefined();
    expect(h?.closed.value).toBeUndefined();
  });
});

test('scheduledSet_updatesDate_preservingRepeater', () => {
  const next = editOrgDocument(
    '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n',
    (doc) => {
      doc.headlineAt(0)?.scheduled.set(new Date(2026, 4, 14));
    }
  );
  expect(next).toBe('* TODO Daily\nSCHEDULED: <2026-05-14 Thu +1d>\n');
});

test('scheduledSet_overridesRepeater_viaOptions', () => {
  const next = editOrgDocument(
    '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n',
    (doc) => {
      doc.headlineAt(0)?.scheduled.set(new Date(2026, 4, 14), {
        repeater: { type: '+', value: 2, unit: 'w' },
      });
    }
  );
  expect(next).toBe('* TODO Daily\nSCHEDULED: <2026-05-14 Thu +2w>\n');
});

test('scheduledSet_clearsRepeater_whenOptionNull', () => {
  const next = editOrgDocument(
    '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n',
    (doc) => {
      doc
        .headlineAt(0)
        ?.scheduled.set(new Date(2026, 4, 14), { repeater: null });
    }
  );
  expect(next).toBe('* TODO Daily\nSCHEDULED: <2026-05-14 Thu>\n');
});

test('closedSet_insertsClosedFirst_whenScheduledExists', () => {
  const next = editOrgDocument(
    '* TODO Task\nSCHEDULED: <2026-05-13 Wed>\nBody\n',
    (doc) => {
      doc.headlineAt(0)?.closed.set(new Date(2026, 4, 13, 10, 0));
    }
  );
  expect(next).toBe(
    '* TODO Task\nCLOSED: [2026-05-13 Wed 10:00] SCHEDULED: <2026-05-13 Wed>\nBody\n'
  );
});

test('closedSet_setsDate_whenNoPlanningLineExists', () => {
  const next = editOrgDocument('* TODO Task\nBody\n', (doc) => {
    doc.headlineAt(0)?.closed.set(new Date(2026, 4, 13, 10, 0));
  });
  expect(next).toBe('* TODO Task\nCLOSED: [2026-05-13 Wed 10:00]\nBody\n');
});

test('scheduledSet_addsToPlanningLine_whenOnlyClosedExists', () => {
  const next = editOrgDocument(
    '* TODO Task\nCLOSED: [2026-05-13 Wed 10:00]\nBody\n',
    (doc) => {
      doc.headlineAt(0)?.scheduled.set(new Date(2026, 4, 14), {
        repeater: { type: '+', value: 1, unit: 'd' },
      });
    }
  );
  expect(next).toBe(
    '* TODO Task\nCLOSED: [2026-05-13 Wed 10:00] SCHEDULED: <2026-05-14 Thu +1d>\nBody\n'
  );
});

test('closedClear_removesEntirePlanningLine_whenLastSlot', () => {
  const next = editOrgDocument(
    '* TODO Task\nCLOSED: [2026-05-13 Wed 10:00]\nBody\n',
    (doc) => {
      doc.headlineAt(0)?.closed.clear();
    }
  );
  expect(next).toBe('* TODO Task\nBody\n');
});

test('closedClear_preservesRemainingPlanningEntries', () => {
  const next = editOrgDocument(
    '* TODO Task\nCLOSED: [2026-05-13 Wed 10:00] SCHEDULED: <2026-05-14 Thu>\n',
    (doc) => {
      doc.headlineAt(0)?.closed.clear();
    }
  );
  expect(next).toBe('* TODO Task\nSCHEDULED: <2026-05-14 Thu>\n');
});

test('closedClear_isNoOp_whenSlotAbsent', () => {
  const content = '* TODO Task\n';
  expect(
    editOrgDocument(content, (doc) => doc.headlineAt(0)?.closed.clear())
  ).toBe(content);
});

test('advanceRepeater_advancesDate_withDailyRepeater', () => {
  const next = editOrgDocument(
    '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n',
    (doc) => {
      const advanced = doc
        .headlineAt(0)
        ?.scheduled.advanceRepeater(new Date(2026, 4, 13, 12, 0));
      expect(advanced).toBe(true);
    }
  );
  expect(next).toBe('* TODO Daily\nSCHEDULED: <2026-05-14 Thu +1d>\n');
});

test('advanceRepeater_returnsFalse_whenNoRepeater', () => {
  editOrgDocument('* TODO Task\nSCHEDULED: <2026-05-13 Wed>\n', (doc) => {
    expect(
      doc.headlineAt(0)?.scheduled.advanceRepeater(new Date(2026, 4, 13))
    ).toBe(false);
  });
});

test('rewindRepeater_invertsAdvance_forDailyRepeater', () => {
  const advanced = editOrgDocument(
    '* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n',
    (doc) => {
      doc
        .headlineAt(0)
        ?.scheduled.advanceRepeater(new Date(2026, 4, 13, 12, 0));
    }
  );
  expect(advanced).toContain('SCHEDULED: <2026-05-14 Thu +1d>');

  const next = editOrgDocument(advanced, (doc) => {
    expect(doc.headlineAt(0)?.scheduled.rewindRepeater()).toBe(true);
  });
  expect(next).toBe('* TODO Daily\nSCHEDULED: <2026-05-13 Wed +1d>\n');
});

test('rewindRepeater_clampsToLastDay_forMonthlyDate', () => {
  const next = editOrgDocument(
    '* TODO Monthly\nSCHEDULED: <2026-03-31 Tue +1m>\n',
    (doc) => {
      doc.headlineAt(0)?.scheduled.rewindRepeater();
    }
  );
  expect(next).toBe('* TODO Monthly\nSCHEDULED: <2026-02-28 Sat +1m>\n');
});

test('rewindRepeater_returnsFalse_whenNoRepeater', () => {
  editOrgDocument('* TODO Task\nSCHEDULED: <2026-05-13 Wed>\n', (doc) => {
    expect(doc.headlineAt(0)?.scheduled.rewindRepeater()).toBe(false);
  });
});
