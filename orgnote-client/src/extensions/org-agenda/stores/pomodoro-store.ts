import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { isPresent, to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { STOPWATCH_MAX_SECONDS, SECONDS_PER_MINUTE } from '../constants';
import { orgAgendaManifest } from '../manifest';
import { resolveAgendaConfig } from '../agenda-config';
import type { AgendaTask } from '../types';
import {
  completePomodoroTaskAfterConfirmation,
  type PomodoroTaskCompletionResult,
} from '../services/pomodoro-task-completion';
import { writeSessionClock, type ClockWriteResult } from '../services/pomodoro-clock';
import { notifyPomodoroComplete } from '../services/pomodoro-notifications';
import {
  adjustTaskForInsertion,
  calculateSegmentElapsed,
  formatSessionTime,
  resolvePomodoroEnd,
  toPomodoroTask,
  toSelectedTask,
  type ActiveSession,
  type PomodoroTask,
} from '../services/pomodoro-session';
import {
  clearPersistedPomodoroSession,
  clearStoppedPomodoroSession,
  loadPersistedPomodoroSession,
  loadPersistedPomodoroTask,
  persistPomodoroSession,
  persistPomodoroTask,
} from '../services/pomodoro-session-storage';
import { openPomodoroTaskCompletion } from '../services/pomodoro-task-selection';

export type { PomodoroTask } from '../services/pomodoro-session';

const TIMER_INTERVAL_MS = 1000;

export const usePomodoroStore = defineStore('pomodoro', () => {
  const agendaConfig = computed(() =>
    resolveAgendaConfig(api.core.useExtensions().getExtensionConfig(orgAgendaManifest.name).value),
  );

  const session = ref<ActiveSession | null>(null);
  const elapsed = ref(0);
  const isPaused = ref(false);
  const durationMin = ref(agendaConfig.value.pomoDuration);
  const sessionType = ref<'pomo' | 'stopwatch'>('pomo');
  const selectedTask = ref<AgendaTask | null>(null);
  const isTransitioning = ref(false);
  let intervalHandle: ReturnType<typeof setInterval> | null = null;

  const durationSeconds = computed(() => durationMin.value * SECONDS_PER_MINUTE);
  const isRunning = computed(() => isPresent(session.value) && !isPaused.value);
  const hasSession = computed(() => isPresent(session.value));

  const progress = computed(() => {
    if (sessionType.value === 'stopwatch') return 0;
    return Math.min(1, elapsed.value / durationSeconds.value);
  });

  const displayTime = computed(() => {
    if (sessionType.value === 'stopwatch')
      return formatSessionTime(Math.min(elapsed.value, STOPWATCH_MAX_SECONDS));
    return formatSessionTime(Math.max(0, durationSeconds.value - elapsed.value));
  });

  const resetState = (): void => {
    session.value = null;
    elapsed.value = 0;
    isPaused.value = false;
  };

  const applyTaskCompletionResult = (result: PomodoroTaskCompletionResult): void => {
    if (result !== 'completed') return;
    selectedTask.value = null;
  };

  const finishElapsedPomodoroSession = async (s: ActiveSession): Promise<void> => {
    const completedAt = resolvePomodoroEnd(s);
    resetState();
    notifyPomodoroComplete(agendaConfig.value.soundEnabled);
    await writeSessionClock(s, completedAt);
    await clearPersistedPomodoroSession();
    const result = await completePomodoroTaskAfterConfirmation(api, s, completedAt);
    applyTaskCompletionResult(result);
  };

  const stopTick = (): void => {
    if (!intervalHandle) return;
    clearInterval(intervalHandle);
    intervalHandle = null;
  };

  const startTick = (): void => {
    if (intervalHandle) return;
    intervalHandle = setInterval(async () => {
      const s = session.value;
      if (!s || isPaused.value) return;
      elapsed.value = s.accumulatedSeconds + calculateSegmentElapsed(s);
      if (s.type !== 'pomo' || elapsed.value < durationSeconds.value) return;
      stopTick();
      await finishElapsedPomodoroSession(s);
    }, TIMER_INTERVAL_MS);
  };

  const startSession = async (
    task: AgendaTask,
    type: 'pomo' | 'stopwatch',
  ): Promise<void> => {
    if (isTransitioning.value) return;
    stopTick();
    const pomodoroTask = toPomodoroTask(task);
    const s: ActiveSession = {
      ...pomodoroTask,
      segmentStartedAt: new Date().toISOString(),
      accumulatedSeconds: 0,
      duration: durationMin.value,
      type,
      paused: false,
    };
    selectedTask.value = task;
    session.value = s;
    sessionType.value = type;
    elapsed.value = 0;
    isPaused.value = false;
    await persistPomodoroSession(s);
    await persistPomodoroTask(pomodoroTask);
    startTick();
  };

  const settleRunningSegment = async (
    activeSession: ActiveSession,
    endedAt: Date,
  ): Promise<ClockWriteResult | null> => {
    if (activeSession.paused) return null;
    const writeResult = await writeSessionClock(activeSession, endedAt);
    if (!writeResult.wasWritten) return writeResult;
    activeSession.accumulatedSeconds += calculateSegmentElapsed(activeSession, endedAt);
    elapsed.value = activeSession.accumulatedSeconds;
    return writeResult;
  };

  const changeTaskTransition = async (task: AgendaTask): Promise<void> => {
    const activeSession = session.value;
    if (!activeSession) {
      selectedTask.value = task;
      return;
    }
    stopTick();
    const changedAt = new Date();
    const writeResult = await settleRunningSegment(activeSession, changedAt);
    if (session.value !== activeSession) return;
    if (writeResult && !writeResult.wasWritten) {
      startTick();
      return;
    }
    const nextTask = adjustTaskForInsertion(task, activeSession, writeResult?.insertion ?? null);
    const nextSession = {
      ...activeSession,
      ...toPomodoroTask(nextTask),
      segmentStartedAt: changedAt.toISOString(),
    };
    selectedTask.value = nextTask;
    session.value = nextSession;
    await persistPomodoroSession(nextSession);
    await persistPomodoroTask(nextSession);
    if (!nextSession.paused) startTick();
  };

  const changeTask = async (task: AgendaTask): Promise<void> => {
    if (isTransitioning.value) return;
    isTransitioning.value = true;
    const result = await to(changeTaskTransition, 'Failed to change Pomodoro task')(task);
    isTransitioning.value = false;
    if (result.isOk()) return;
    if (isRunning.value) startTick();
    reporter.reportError(result.error);
  };

  const changeSessionType = async (type: ActiveSession['type']): Promise<void> => {
    if (isTransitioning.value) return;
    sessionType.value = type;
    const activeSession = session.value;
    if (!activeSession || activeSession.type === type) return;
    activeSession.type = type;
    await persistPomodoroSession(activeSession);
  };

  const changeDuration = async (duration: number): Promise<void> => {
    if (isTransitioning.value) return;
    durationMin.value = duration;
    const activeSession = session.value;
    if (!activeSession) return;
    activeSession.duration = duration;
    await persistPomodoroSession(activeSession);
  };

  const pauseSession = async (): Promise<void> => {
    if (isTransitioning.value) return;
    const s = session.value;
    if (!s || isPaused.value) return;
    stopTick();
    const pausedAt = new Date();
    const segSec = calculateSegmentElapsed(s);
    s.accumulatedSeconds += segSec;
    s.paused = true;
    elapsed.value = s.accumulatedSeconds;
    isPaused.value = true;
    await writeSessionClock(s, pausedAt);
    await persistPomodoroSession(s);
  };

  const resumeSession = async (): Promise<void> => {
    if (isTransitioning.value) return;
    const s = session.value;
    if (!s || !isPaused.value) return;
    s.segmentStartedAt = new Date().toISOString();
    s.paused = false;
    isPaused.value = false;
    await persistPomodoroSession(s);
    startTick();
  };

  const stopSession = async (): Promise<void> => {
    if (isTransitioning.value) return;
    const s = session.value;
    if (!s) return;
    const shouldWriteClock = !isPaused.value;
    stopTick();
    resetState();
    if (shouldWriteClock) await writeSessionClock(s, new Date());
    await clearStoppedPomodoroSession(s, () => session.value);
  };

  const restoreSession = async (): Promise<void> => {
    if (isTransitioning.value) return;
    const s = await loadPersistedPomodoroSession();
    if (!s) return;
    selectedTask.value = toSelectedTask(s);

    if (s.paused) {
      session.value = s;
      durationMin.value = s.duration;
      sessionType.value = s.type;
      elapsed.value = s.accumulatedSeconds;
      isPaused.value = true;
      return;
    }

    const totalElapsed = s.accumulatedSeconds + calculateSegmentElapsed(s);

    if (s.type === 'pomo' && totalElapsed >= s.duration * SECONDS_PER_MINUTE) {
      await finishElapsedPomodoroSession(s);
      return;
    }

    stopTick();
    session.value = s;
    durationMin.value = s.duration;
    sessionType.value = s.type;
    elapsed.value = totalElapsed;
    isPaused.value = false;
    startTick();
  };

  const loadLastTask = (): Promise<PomodoroTask | null> => loadPersistedPomodoroTask();

  return {
    session,
    elapsed,
    isPaused,
    isTransitioning,
    durationMin,
    sessionType,
    isRunning,
    hasSession,
    progress,
    displayTime,
    startSession,
    changeTask,
    changeSessionType,
    changeDuration,
    pauseSession,
    resumeSession,
    stopSession,
    restoreSession,
    loadLastTask,
    openTaskCompletion: openPomodoroTaskCompletion,
    applyTaskCompletionResult,
    selectedTask,
  };
});
