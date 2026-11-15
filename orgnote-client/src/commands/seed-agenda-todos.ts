import type { OrgNoteApi } from 'orgnote-api';

const FILE_COUNT = 100;
const TODOS_PER_FILE_MIN = 3;
const TODOS_PER_FILE_MAX = 8;
const AGENDA_DEBUG_FOLDER = ['agenda', 'debug'];
const HABITS_DEBUG_FOLDER = ['agenda', 'debug', 'habits'];
const HABIT_FILE_COUNT = 3;
const HABITS_PER_FILE_MIN = 4;
const HABITS_PER_FILE_MAX = 8;
const WRITE_BATCH_SIZE = 20;

const TODO_KEYWORDS = ['TODO', 'TODO', 'TODO', 'IN-PROGRESS', 'WAITING', 'DONE'] as const;
const PRIORITIES = ['[#A]', '[#B]', '[#C]', ''] as const;

const PROJECTS = [
  'OrgNote',
  'Backend',
  'Mobile',
  'Design',
  'Infra',
  'Docs',
  'Research',
  'Testing',
] as const;

const TODO_TITLES = [
  'Fix flaky tests in CI pipeline',
  'Review pull request from teammate',
  'Update dependency to latest version',
  'Write unit tests for new feature',
  'Refactor authentication module',
  'Set up staging environment',
  'Document API endpoints',
  'Investigate memory leak in production',
  'Migrate database schema',
  'Implement pagination for list view',
  'Add error boundaries to React components',
  'Optimize slow SQL query',
  'Set up monitoring alerts',
  'Conduct performance audit',
  'Review security vulnerabilities',
  'Create onboarding guide',
  'Sync with design team on mockups',
  'Deploy hotfix to production',
  'Archive stale branches',
  'Update changelog for release',
  'Configure rate limiting',
  'Add integration tests',
  'Clean up dead code',
  'Extract reusable component',
  'Fix mobile layout on small screens',
  'Add dark mode support',
  'Investigate user-reported crash',
  'Prepare demo for stakeholders',
  'Write ADR for architecture decision',
  'Set up feature flags',
] as const;

const FILE_CONTEXTS = [
  'sprint',
  'backlog',
  'inbox',
  'weekly',
  'project',
  'focus',
  'triage',
  'someday',
] as const;

const TAGS_POOL = [
  'work',
  'urgent',
  'low-priority',
  'blocked',
  'in-review',
  'debt',
  'feature',
  'bug',
  'docs',
  'infra',
] as const;

const createRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let n = s;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T>(arr: readonly T[], random: () => number): T => {
  const idx = Math.floor(random() * arr.length);
  return (arr[idx] ?? arr[0]) as T;
};

const pickCount = (random: () => number, min: number, max: number): number =>
  Math.floor(random() * (max - min + 1)) + min;

const randomFutureDate = (random: () => number): string => {
  const days = Math.floor(random() * 30) - 5; // -5..+25 days from today
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const buildTodoHeadline = (random: () => number, index: number): string => {
  const keyword = pick(TODO_KEYWORDS, random);
  const priority = pick(PRIORITIES, random);
  const title = pick(TODO_TITLES, random);
  const tag = random() > 0.6 ? `:${pick(TAGS_POOL, random)}:` : '';

  const header = `** ${keyword}${priority ? ` ${priority}` : ''} ${title} ${index + 1}${tag ? `  ${tag}` : ''}`;

  const lines: string[] = [header];

  const hasScheduled = random() > 0.5;
  const hasDeadline = random() > 0.7;
  const scheduledPart = hasScheduled
    ? `SCHEDULED: <${randomFutureDate(random)} ${pick(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], random)}>`
    : '';
  const deadlinePart = hasDeadline
    ? `DEADLINE: <${randomFutureDate(random)} ${pick(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], random)}>`
    : '';
  const planningLine = [scheduledPart, deadlinePart].filter(Boolean).join(' ');
  if (planningLine) lines.push(`   ${planningLine}`);

  if (random() > 0.6) {
    lines.push(`   - ${pick(TODO_TITLES, random)}`);
  }

  return lines.join('\n');
};

const buildFileContent = (
  fileIndex: number,
  random: () => number,
): { path: string[]; content: string } => {
  const project = pick(PROJECTS, random);
  const context = pick(FILE_CONTEXTS, random);
  const fileName = `debug-${String(fileIndex + 1).padStart(3, '0')}-${project.toLowerCase()}-${context}.org`;
  const title = `${project} ${context} ${fileIndex + 1}`;
  const tag = pick(TAGS_POOL, random);

  const todoCount = pickCount(random, TODOS_PER_FILE_MIN, TODOS_PER_FILE_MAX);
  const todos = Array.from({ length: todoCount }, (_, i) => buildTodoHeadline(random, i));

  const content =
    `:PROPERTIES:\n:ID: agenda-debug-${String(fileIndex + 1).padStart(4, '0')}\n:END:\n` +
    `#+TITLE: ${title}\n` +
    `#+FILETAGS: :${tag}:debug:\n\n` +
    `* Overview\n\nDebug file ${fileIndex + 1} for agenda completion testing.\n\n` +
    `* Tasks\n\n` +
    todos.join('\n\n') +
    '\n';

  return { path: [...AGENDA_DEBUG_FOLDER, fileName], content };
};

const writeBatch = async (
  fs: ReturnType<OrgNoteApi['core']['useFileSystem']>,
  batch: Array<{ path: string[]; content: string }>,
): Promise<void> => {
  await Promise.all(batch.map(({ path, content }) => fs.writeFile(path, content)));
};

const HABIT_TITLES = [
  'Drink 8 glasses of water',
  'Morning meditation',
  'Read for 30 minutes',
  'Exercise',
  'Journal writing',
  'Review daily goals',
  'Evening walk',
  'Practice language learning',
  'Stretching',
  'Review flashcards',
  'Cold shower',
  'No social media before noon',
  'Gratitude log',
  'Plan tomorrow',
  'Learn something new',
] as const;

const HABIT_REPEATERS = ['.+1d', '.+1d', '.+1d', '++1d', '.+1w'] as const;

const HABIT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const orgDateTime = (d: Date): string => {
  const day = HABIT_DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${isoDate(d)} ${day} ${hh}:${mm}`;
};

const buildClockEntry = (date: Date): string => {
  const start = orgDateTime(date);
  const end = new Date(date.getTime() + 10 * 60 * 1000);
  return `CLOCK: [${start}]--[${orgDateTime(end)}] =>  0:10`;
};

const buildHabitHeadline = (random: () => number, index: number): string => {
  const title = pick(HABIT_TITLES, random);
  const repeater = pick(HABIT_REPEATERS, random);
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + 1);
  const day = HABIT_DAYS[scheduled.getDay() === 0 ? 6 : scheduled.getDay() - 1];

  const completionCount = Math.floor(random() * 14);
  const clocks = Array.from({ length: completionCount }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i - 1);
    d.setHours(7 + Math.floor(random() * 4), Math.floor(random() * 60));
    return buildClockEntry(d);
  });

  const logbook =
    clocks.length > 0 ? `:LOGBOOK:\n${clocks.join('\n')}\n:END:` : '';

  return [
    `** TODO ${title} ${index + 1}`,
    `   SCHEDULED: <${isoDate(scheduled)} ${day} ${repeater}>`,
    ...(logbook ? [logbook] : []),
    `   :PROPERTIES:`,
    `   :STYLE:    habit`,
    `   :END:`,
  ].join('\n');
};

const buildHabitFileContent = (
  fileIndex: number,
  random: () => number,
): { path: string[]; content: string } => {
  const fileName = `habits-${String(fileIndex + 1).padStart(2, '0')}.org`;
  const title = `Habits ${fileIndex + 1}`;
  const habitCount = pickCount(random, HABITS_PER_FILE_MIN, HABITS_PER_FILE_MAX);
  const habits = Array.from({ length: habitCount }, (_, i) => buildHabitHeadline(random, i));

  const content =
    `:PROPERTIES:\n:ID: agenda-habits-debug-${String(fileIndex + 1).padStart(3, '0')}\n:END:\n` +
    `#+TITLE: ${title}\n` +
    `#+FILETAGS: :habit:debug:\n\n` +
    `* Habits\n\n` +
    habits.join('\n\n') +
    '\n';

  return { path: [...HABITS_DEBUG_FOLDER, fileName], content };
};

export const seedAgendaTodos = async (api: OrgNoteApi): Promise<void> => {
  const fs = api.core.useFileSystem();
  const random = createRandom(Date.now());

  const todoFiles = Array.from({ length: FILE_COUNT }, (_, i) => buildFileContent(i, random));
  const habitFiles = Array.from({ length: HABIT_FILE_COUNT }, (_, i) =>
    buildHabitFileContent(i, random),
  );
  const allFiles = [...todoFiles, ...habitFiles];

  for (let i = 0; i < allFiles.length; i += WRITE_BATCH_SIZE) {
    await writeBatch(fs, allFiles.slice(i, i + WRITE_BATCH_SIZE));
  }
};
