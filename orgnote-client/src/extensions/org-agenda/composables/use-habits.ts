import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { ISO_DATE_FORMAT } from 'src/utils/org-date';
import type { ComputedRef, Ref } from 'vue';
import { computed, onMounted, ref } from 'vue';
import { join, type FileMeta, type FileTask } from 'orgnote-api';
import { isPresent } from 'orgnote-api/utils';
import { storeToRefs } from 'pinia';
import { extractOrgTitleFromPath } from 'src/utils/extract-org-title-from-path';
import { useAgendaTasksStore } from '../stores/agenda-tasks-store';
import type { AgendaHabitView, WeekDayCompletion } from '../types';
import { calcCurrentStreak, calcTotalDays } from '../utils/streak';

export interface UseHabitsResult {
  loading: Ref<boolean>;
  habits: ComputedRef<AgendaHabitView[]>;
  weekDays: ComputedRef<WeekDayCompletion[]>;
  selectedDate: Ref<string>;
  selectDay: (date: string) => void;
}

const WEEK_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

const resolveAbsolutePath = (file: FileMeta): string => join('/', ...file.filePath);

const resolveFileTitle = (file: FileMeta): string => {
  const absolutePath = resolveAbsolutePath(file);
  return file.title?.trim() || extractOrgTitleFromPath(absolutePath);
};

export const clockMatchesDate = (task: FileTask, date: string): boolean =>
  isPresent(task.clocks?.find((clock) => clock.date?.startsWith(date)));

const habitTasks = (file: FileMeta): FileTask[] =>
  (file.tasks ?? []).filter((task) => task.isHabit === true);

export const buildHabitView = (
  task: FileTask,
  filePath: string,
  fileTitle: string,
  now: Date,
): AgendaHabitView => {
  const clocks = task.clocks ?? [];
  const today = format(now, ISO_DATE_FORMAT);
  return {
    ...task,
    filePath,
    fileTitle,
    totalDays: calcTotalDays(clocks),
    currentStreak: calcCurrentStreak(clocks, now),
    completedToday: clockMatchesDate(task, today),
  };
};

const buildHabit = (task: FileTask, file: FileMeta, now: Date): AgendaHabitView =>
  buildHabitView(task, resolveAbsolutePath(file), resolveFileTitle(file), now);

const buildFileHabits = (file: FileMeta, now: Date): AgendaHabitView[] =>
  habitTasks(file).map((task) => buildHabit(task, file, now));

export const getCompletionLevel = (
  completedCount: number,
  totalCount: number,
): WeekDayCompletion['completionLevel'] => {
  if (totalCount === 0) return 'none';
  if (completedCount === 0) return 'none';
  if (completedCount === totalCount) return 'full';
  return 'partial';
};

export const buildWeekDay = (
  date: Date,
  habits: AgendaHabitView[],
  today: Date,
): WeekDayCompletion => {
  const isoDate = format(date, ISO_DATE_FORMAT);
  const completed = habits.filter((habit) => clockMatchesDate(habit, isoDate)).length;
  const total = habits.length;
  return {
    date: isoDate,
    dayLabel: format(date, 'EEE'),
    isToday: isSameDay(date, today),
    completionLevel: getCompletionLevel(completed, total),
    completionRatio: total === 0 ? 0 : completed / total,
  };
};

export const buildWeekDays = (habits: AgendaHabitView[], now: Date): WeekDayCompletion[] => {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  return WEEK_OFFSETS.map((offset) => buildWeekDay(addDays(weekStart, offset), habits, now));
};

export const useHabits = (): UseHabitsResult => {
  const tasksStore = useAgendaTasksStore();
  const { agendaFiles, loading } = storeToRefs(tasksStore);
  const selectedDate = ref<string>(format(new Date(), ISO_DATE_FORMAT));
  const selectDay = (date: string): void => {
    selectedDate.value = date;
  };
  const habits = computed(() =>
    agendaFiles.value.flatMap((file) => buildFileHabits(file, new Date())),
  );
  const weekDays = computed(() => buildWeekDays(habits.value, new Date()));

  onMounted(() => {
    void tasksStore.ensureLoaded();
  });

  return { loading, habits, weekDays, selectedDate, selectDay };
};
