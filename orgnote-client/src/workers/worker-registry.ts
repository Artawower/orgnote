import type {
  OrgNoteCoreApi,
  OrgNoteWorkerContract,
  OrgNoteWorkerHandle,
  WorkerSpawnOptions,
} from 'orgnote-api';
import type { HostWorkerEndpoint } from './worker-endpoint';
import {
  WorkerAlreadyRegisteredError,
  WorkerNotRegisteredError,
} from './worker-errors';

export type HostWorkerFactory = (
  options?: WorkerSpawnOptions,
) => HostWorkerEndpoint | Promise<HostWorkerEndpoint>;

export interface HostWorkerRegistrationOptions {
  readonly coreApi?: OrgNoteCoreApi;
}

interface DisposableWorkerHandle {
  dispose(): void;
}

interface HostWorkerRegistration {
  readonly factory: HostWorkerFactory;
  readonly coreApi?: OrgNoteCoreApi;
  readonly handles: Set<DisposableWorkerHandle>;
  isActive: boolean;
}

export interface RegisteredHostWorker {
  readonly endpoint: HostWorkerEndpoint;
  readonly coreApi?: OrgNoteCoreApi;
  manage<TContract extends OrgNoteWorkerContract>(
    handle: OrgNoteWorkerHandle<TContract>,
  ): OrgNoteWorkerHandle<TContract>;
}

const registrations = new Map<string, HostWorkerRegistration>();

export const createModuleWorkerFactory = (url: URL): HostWorkerFactory => (options) =>
  new Worker(url, {
    type: 'module',
    ...(options?.name ? { name: options.name } : {}),
  });

const manageHandle = <TContract extends OrgNoteWorkerContract>(
  registration: HostWorkerRegistration,
  handle: OrgNoteWorkerHandle<TContract>,
): OrgNoteWorkerHandle<TContract> => {
  let isDisposed = false;
  const managed = {
    call: handle.call.bind(handle),
    on: handle.on.bind(handle),
    dispose: () => {
      if (isDisposed) return;
      isDisposed = true;
      registration.handles.delete(managed);
      handle.dispose();
    },
  } satisfies OrgNoteWorkerHandle<TContract>;
  registration.handles.add(managed);
  return managed;
};

export const registerHostWorker = (
  workerId: string,
  factory: HostWorkerFactory,
  options: HostWorkerRegistrationOptions = {},
): (() => void) => {
  if (registrations.has(workerId)) throw new WorkerAlreadyRegisteredError(workerId);
  const registration: HostWorkerRegistration = {
    factory,
    coreApi: options.coreApi,
    handles: new Set(),
    isActive: true,
  };
  registrations.set(workerId, registration);
  return () => {
    if (registrations.get(workerId) !== registration) return;
    registration.isActive = false;
    registrations.delete(workerId);
    registration.handles.forEach((handle) => handle.dispose());
    registration.handles.clear();
  };
};

export const isHostWorkerRegistered = (workerId: string): boolean =>
  registrations.has(workerId);

export const createRegisteredWorker = async (
  workerId: string,
  options?: WorkerSpawnOptions,
): Promise<RegisteredHostWorker> => {
  const registration = registrations.get(workerId);
  if (!registration) throw new WorkerNotRegisteredError(workerId);
  const endpoint = await registration.factory(options);
  if (!registration.isActive || registrations.get(workerId) !== registration) {
    endpoint.terminate();
    throw new WorkerNotRegisteredError(workerId);
  }
  return {
    endpoint,
    coreApi: registration.coreApi,
    manage: (handle) => manageHandle(registration, handle),
  };
};
