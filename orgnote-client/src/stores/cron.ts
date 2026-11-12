import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ToadScheduler, SimpleIntervalJob, AsyncTask, CronJob } from 'toad-scheduler';
import { Cron } from 'croner';
import { to } from 'orgnote-api/utils';
import { Platform } from 'quasar';
import type {
  CronStore,
  CronTask,
  CronTaskConfig,
  PeriodicTaskStatus,
  SchedulerStatus,
  OrgNoteApi,
} from 'orgnote-api';
import { api } from 'src/boot/api';
import { logger } from 'src/boot/logger';
import { reporter } from 'src/boot/report';

type Handler = (api: OrgNoteApi) => Promise<void> | void;
type TaskRuntime = { handler: Handler; job?: SimpleIntervalJob | CronJob; isRunning: boolean };

const isIntervalTask = (
  config: CronTaskConfig,
): config is CronTaskConfig & { interval: number } => {
  return 'interval' in config;
};

const isCronExpressionTask = (
  config: CronTaskConfig,
): config is CronTaskConfig & { cron: string } => {
  return 'cron' in config;
};

const isPlatformAllowed = (platforms?: string[]): boolean => {
  if (!platforms || platforms.length === 0) return true;

  const currentPlatform = Platform.is;
  return platforms.some((p) => currentPlatform[p as keyof typeof currentPlatform]);
};

const calculateNextRun = (config: CronTaskConfig): number | undefined => {
  if (isIntervalTask(config)) {
    return Date.now() + config.interval;
  }

  const nextRunResult = to(() => new Cron(config.cron, { paused: true }).nextRun()?.getTime())();

  if (nextRunResult.isErr()) {
    logger.error(`Failed to compute next run for cron ${config.id}:`, nextRunResult.error);
    return undefined;
  }

  return nextRunResult.value;
};

export const useCronStore = defineStore<'cron', CronStore>('cron', () => {
  const scheduler = new ToadScheduler();
  const tasks = ref<Record<string, CronTask>>({});
  const status = ref<SchedulerStatus>('stopped');
  const runtimes = new Map<string, TaskRuntime>();
  let visibilityHandler: (() => void) | undefined;

  const setStatus = (nextStatus: SchedulerStatus): void => {
    if (status.value === nextStatus) return;
    status.value = nextStatus;
  };

  const isRunning = computed(() => status.value === 'running');

  const updateTask = (id: string, updates: Partial<CronTask>): void => {
    const task = tasks.value[id];
    if (!task) return;

    tasks.value = {
      ...tasks.value,
      [id]: { ...task, ...updates },
    };
  };

  const addJobToScheduler = (job?: SimpleIntervalJob | CronJob): void => {
    if (!job) return;
    if (job instanceof SimpleIntervalJob) {
      scheduler.addSimpleIntervalJob(job);
      return;
    }

    if (job instanceof CronJob) {
      scheduler.addCronJob(job);
    }
  };

  const canRunTask = async (config: CronTaskConfig, runtime: TaskRuntime): Promise<boolean> => {
    const task = tasks.value[config.id];
    if (!task || task.status !== 'active') return false;
    if (!isPlatformAllowed(config.platforms)) return false;
    if (config.preventOverrun !== false && runtime.isRunning) return false;

    return config.runWhen ? await config.runWhen(api) : true;
  };

  const executeWithTimeout = async (
    handler: Handler,
    timeout: number,
    taskId: string,
  ): Promise<boolean> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Task ${taskId} timed out`)), timeout);
    });

    const result = await to(
      async () => Promise.race([Promise.resolve(handler(api)), timeoutPromise]),
      `Task ${taskId} execution failed`,
    )();

    if (timeoutId) clearTimeout(timeoutId);

    if (result.isErr()) {
      reporter.report(result.error);
      return false;
    }

    return true;
  };

  const runTask = async (config: CronTaskConfig, runtime: TaskRuntime): Promise<void> => {
    if (!(await canRunTask(config, runtime))) return;

    runtime.isRunning = true;
    const timeout = config.timeout ?? 30000;
    const success = await executeWithTimeout(runtime.handler, timeout, config.id);
    runtime.isRunning = false;

    if (!success) return;

    updateTask(config.id, {
      lastRun: Date.now(),
      nextRun: calculateNextRun(config),
    });
  };

  const createTask = (config: CronTaskConfig, runtime: TaskRuntime): AsyncTask => {
    return new AsyncTask(
      config.id,
      async () => runTask(config, runtime),
      (error: Error) => {
        logger.error(`Task ${config.id} error:`, error);
        runtime.isRunning = false;
      },
    );
  };

  const createRuntime = (config: CronTaskConfig): TaskRuntime => {
    const runtime: TaskRuntime = {
      handler: config.handler,
      isRunning: false,
    };

    const asyncTask = createTask(config, runtime);
    runtime.job = createJob(config, asyncTask);

    return runtime;
  };

  const mergeTaskConfig = (
    existingTask: CronTask | undefined,
    config: CronTaskConfig,
  ): CronTask => {
    if (!existingTask) {
      return {
        ...config,
        status: 'active',
        lastRun: undefined,
        nextRun: calculateNextRun(config),
      };
    }

    return {
      ...existingTask,
      ...config,
      status: existingTask.status,
      lastRun: existingTask.lastRun,
      nextRun: existingTask.nextRun,
    };
  };

  const replaceRuntime = (id: string): void => {
    const runtime = runtimes.get(id);
    if (!runtime) return;

    scheduler.removeById(id);
    runtimes.delete(id);
  };

  const attachIfRunning = (task: CronTask, runtime: TaskRuntime): void => {
    if (!isRunning.value) return;
    if (task.status !== 'active') return;
    if (!runtime.job) return;

    addJobToScheduler(runtime.job);
  };

  const createJob = (config: CronTaskConfig, asyncTask: AsyncTask): SimpleIntervalJob | CronJob => {
    const jobId = config.id;

    if (isIntervalTask(config)) {
      return new SimpleIntervalJob(
        {
          milliseconds: config.interval,
          runImmediately: config.runImmediately ?? false,
        },
        asyncTask,
        { id: jobId, preventOverrun: config.preventOverrun ?? true },
      );
    }

    if (isCronExpressionTask(config)) {
      return new CronJob({ cronExpression: config.cron }, asyncTask, {
        id: jobId,
        preventOverrun: config.preventOverrun ?? true,
      });
    }

    reporter.report(new Error(`Invalid task config: must have 'interval' or 'cron' property`));
    return new SimpleIntervalJob({ milliseconds: 0 }, asyncTask, { id: jobId });
  };

  const register = async (config: CronTaskConfig): Promise<CronTask> => {
    replaceRuntime(config.id);

    const runtime = createRuntime(config);
    const cronTask = mergeTaskConfig(tasks.value[config.id], config);

    tasks.value = { ...tasks.value, [config.id]: cronTask };
    runtimes.set(config.id, runtime);

    attachIfRunning(cronTask, runtime);

    return cronTask;
  };

  const unregister = async (id: string): Promise<void> => {
    const runtime = runtimes.get(id);
    if (runtime) {
      scheduler.removeById(id);
      runtimes.delete(id);
    }

    const { [id]: _removed, ...rest } = tasks.value;
    void _removed;
    tasks.value = rest;
  };

  const get = (id: string): CronTask | undefined => {
    return tasks.value[id];
  };

  const pause = async (id: string): Promise<void> => {
    const runtime = runtimes.get(id);
    if (!runtime) return;

    scheduler.stopById(id);
    updateTask(id, { status: 'paused' });
  };

  const resume = async (id: string): Promise<void> => {
    const task = tasks.value[id];
    const runtime = runtimes.get(id);
    if (!task || !runtime) return;

    if (task.status === 'stopped') {
      logger.warn(`Cannot resume stopped task: ${id}. Use register() instead.`);
      return;
    }

    scheduler.startById(id);
    updateTask(id, { status: 'active', nextRun: calculateNextRun(task) });
  };

  const stop = async (id: string): Promise<void> => {
    const runtime = runtimes.get(id);
    if (!runtime) return;

    scheduler.removeById(id);
    runtimes.delete(id);
    const { [id]: _removed, ...rest } = tasks.value;
    void _removed;
    tasks.value = rest;
  };

  const runImmediately = async (id: string): Promise<void> => {
    const task = tasks.value[id];
    const runtime = runtimes.get(id);
    if (!task || !runtime) {
      const error = new Error(`Task ${id} not found`);
      reporter.report(error);
      throw error;
    }

    const manualRunResult = await to(async () => runTask(task, runtime))();

    if (manualRunResult.isErr()) {
      logger.error(`Task ${id} failed during manual run:`, manualRunResult.error);
    }
  };

  const pauseAll = async (): Promise<void> => {
    scheduler.stop();
    Object.entries(tasks.value)
      .filter(([, task]) => task?.status === 'active')
      .forEach(([id]) => {
        updateTask(id, { status: 'paused' });
      });
  };

  const resumeAll = async (): Promise<void> => {
    Array.from(runtimes.entries())
      .filter(([id]) => tasks.value[id]?.status === 'paused')
      .forEach(([id, runtime]) => {
        const task = tasks.value[id];
        if (!task) return;

        addJobToScheduler(runtime.job);
        updateTask(id, { status: 'active', nextRun: calculateNextRun(task) });
      });
  };

  const getByStatus = (taskStatus: PeriodicTaskStatus): CronTask[] => {
    return Object.values(tasks.value).filter((task) => task.status === taskStatus);
  };

  const catchUpMissedTasks = async (): Promise<void> => {
    const now = Date.now();

    const catchUpPromises = Object.entries(tasks.value)
      .filter(([, task]) => task.status === 'active' && task.catchUpOnResume !== false)
      .map(async ([id, task]) => {
        const lastRun = task.lastRun ?? 0;
        const interval = isIntervalTask(task) ? task.interval : 0;

        if (interval === 0) return;

        const missedRuns = Math.floor((now - lastRun) / interval);
        if (missedRuns <= 0) return;

        const maxCatchUp = task.maxCatchUpRuns ?? 1;
        const runsToExecute = Math.min(missedRuns, maxCatchUp);

        const runTasks = Array.from({ length: runsToExecute }, () => runImmediately(id));
        await Promise.all(runTasks);
      });

    await Promise.all(catchUpPromises);
  };

  const handleResume = async (): Promise<void> => {
    await catchUpMissedTasks();
    await resumeAll();
    setStatus('running');
  };

  const handlePause = (): void => {
    scheduler.stop();
    setStatus('stopped');
  };

  const setupLifecycleListeners = (): void => {
    if (typeof document === 'undefined') return;

    visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
        return;
      }

      handlePause();
    };

    document.addEventListener('visibilitychange', visibilityHandler);
  };

  const init = async (): Promise<void> => {
    if (isRunning.value) return;

    setupLifecycleListeners();

    runtimes.forEach((runtime, id) => {
      const task = tasks.value[id];
      if (task?.status !== 'active') return;

      addJobToScheduler(runtime.job);
    });

    setStatus('running');
  };

  const removeLifecycleListeners = (): void => {
    if (visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = undefined;
    }
  };

  const cleanup = async (): Promise<void> => {
    removeLifecycleListeners();
    scheduler.stop();
    runtimes.clear();
    tasks.value = {};
    setStatus('stopped');
  };

  const cronStore: CronStore = {
    tasks,
    status,
    init,
    cleanup,
    get,
    pause,
    resume,
    stop,
    runImmediately,
    pauseAll,
    resumeAll,
    getByStatus,
    register,
    unregister,
  };

  return cronStore;
});
