import { buildBufferUri } from 'orgnote-api';

export const AGENDA_TASKS_PATH = '/agenda-tasks';
export const AGENDA_TASKS_URI = buildBufferUri('builtin', AGENDA_TASKS_PATH);
export const AGENDA_HABITS_URI = buildBufferUri('builtin', '/agenda-habits');
export const AGENDA_POMODORO_URI = buildBufferUri('builtin', '/agenda-pomodoro');
export const AGENDA_POMODORO_STATS_URI = buildBufferUri('builtin', '/agenda-pomodoro-stats');

const AGENDA_DATE_PATH_PATTERN = '\\d{4}-\\d{2}-\\d{2}';
const AGENDA_DAY_PATH_PATTERN =
  `/day/${AGENDA_DATE_PATH_PATTERN}(?:/(?:today|tomorrow))?`;
const AGENDA_RANGE_PATH_PATTERN =
  `/range/${AGENDA_DATE_PATH_PATTERN}/${AGENDA_DATE_PATH_PATTERN}(?:/next7days)?`;
const AGENDA_TASK_SCOPED_PATH_PATTERN = [
  AGENDA_DAY_PATH_PATTERN,
  AGENDA_RANGE_PATH_PATTERN,
  '/preset/(?:overdue|all)',
].join('|');
export const AGENDA_TASKS_PATTERN =
  `^/agenda-tasks(?:${AGENDA_TASK_SCOPED_PATH_PATTERN})?$`;
export const AGENDA_HABITS_PATTERN = '^/agenda-habits$';
export const AGENDA_POMODORO_PATTERN = '^/agenda-pomodoro$';
export const AGENDA_POMODORO_STATS_PATTERN = '^/agenda-pomodoro-stats$';

export const AGENDA_TASKS_COMMAND = 'open agenda tasks';
export const AGENDA_HABITS_COMMAND = 'open agenda habits';
export const AGENDA_POMODORO_COMMAND = 'open agenda pomodoro';
export const AGENDA_POMODORO_STATS_COMMAND = 'open agenda pomodoro stats';

export const AGENDA_TASKS_TODAY_COMMAND = 'agenda tasks: today';
export const AGENDA_TASKS_TOMORROW_COMMAND = 'agenda tasks: tomorrow';
export const AGENDA_TASKS_NEXT7DAYS_COMMAND = 'agenda tasks: next 7 days';
export const AGENDA_TASKS_OVERDUE_COMMAND = 'agenda tasks: overdue';
export const AGENDA_TASKS_ALL_COMMAND = 'agenda tasks: all';
export const AGENDA_TASKS_DATE_FILTER_COMMAND = 'agenda tasks: choose dates';
export const AGENDA_TASKS_CLEAR_DATE_FILTER_COMMAND = 'agenda tasks: clear dates';
export const AGENDA_TASKS_FILE_FILTER_COMMAND = 'agenda tasks: filter by file';

export const AGENDA_TASKS_VIEWER_ID = 'org-agenda:tasks';
export const AGENDA_HABITS_VIEWER_ID = 'org-agenda:habits';
export const AGENDA_POMODORO_VIEWER_ID = 'org-agenda:pomodoro';
export const AGENDA_POMODORO_STATS_VIEWER_ID = 'org-agenda:pomodoro-stats';

export const TASK_DONE_KEYWORD = 'DONE';
export const TASK_TODO_KEYWORD = 'TODO';

export const AGENDA_CREATE_TASK = 'create task';
export const AGENDA_QUICK_ADD_TO_FILE_COMMAND = 'agenda quick add to file';
export const AGENDA_POMODORO_START_COMMAND = 'start pomodoro';
export const AGENDA_POMODORO_START_STOPWATCH_COMMAND = 'start stopwatch';
export const AGENDA_POMODORO_PAUSE_COMMAND = 'pause pomodoro';
export const AGENDA_POMODORO_RESUME_COMMAND = 'resume pomodoro';
export const AGENDA_POMODORO_STOP_COMMAND = 'stop pomodoro';
export const AGENDA_POMODORO_SET_POMO_COMMAND = 'pomodoro mode';
export const AGENDA_POMODORO_SET_STOPWATCH_COMMAND = 'stopwatch mode';

export const STOPWATCH_MAX_SECONDS = 5999;
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_MINUTE = 60;

export const AGENDA_DEFAULT_INBOX_FILENAME = 'inbox.org';

export const AGENDA_TASK_CONTEXT_MENU_GROUP = 'agenda-task';
export const AGENDA_TASK_ADD_TIME_COMMAND = 'add time';
export const AGENDA_TASK_DELETE_COMMAND = 'delete task';
export const AGENDA_TASK_SET_PRIORITY_COMMAND = 'set task priority';
export const AGENDA_TASK_OPEN_COMMAND = 'open task in editor';

export const POMODORO_ACTIVE_SESSION_KEY = 'org-agenda:pomodoro:active';
export const POMODORO_LAST_TASK_KEY = 'org-agenda:pomodoro:last-task';
export const POMODORO_DEFAULT_DURATION_MIN = 25;
export const POMODORO_MIN_DURATION_MIN = 1;
export const POMODORO_MAX_DURATION_MIN = 999;

export { ORG_PRIORITY_LETTERS } from 'src/constants/org-mode';
export type { OrgPriorityLetter } from 'src/constants/org-mode';

export const AGENDA_TASKS_NAV_COMMAND = 'navigate agenda tasks';
