import { expect, test } from 'vitest';
import { createTask } from '../features/create-task';

test('createTask_writesPlainTask', () => {
  const result = createTask('', { title: 'Buy milk' });

  expect(result).toBe('* TODO Buy milk\n');
});

test('createTask_writesScheduledRepeater', () => {
  const result = createTask('', {
    title: 'Daily review',
    scheduled: {
      date: '2026-06-16',
      repeater: { type: '+', value: 1, unit: 'd' },
    },
  });

  expect(result).toBe('* TODO Daily review\nSCHEDULED: <2026-06-16 Tue +1d>\n');
});

test('createTask_writesScheduledRange', () => {
  const result = createTask('', {
    title: 'Conference',
    scheduled: { date: '2026-06-16', to: '2026-06-18' },
  });

  expect(result).toBe(
    '* TODO Conference\nSCHEDULED: <2026-06-16 Tue>--<2026-06-18 Thu>\n',
  );
});

test('createTask_writesHabitProperties', () => {
  const result = createTask('', {
    title: 'Drink water',
    isHabit: true,
    scheduled: {
      date: '2026-06-16',
      repeater: { type: '.+', value: 1, unit: 'd' },
    },
  });

  expect(result).toBe(
    '* TODO Drink water\nSCHEDULED: <2026-06-16 Tue .+1d>\n:PROPERTIES:\n:STYLE: habit\n:END:\n',
  );
});
