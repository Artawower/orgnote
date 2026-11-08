export interface PendingWorkerCall {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly cleanup: () => void;
}

export interface PendingWorkerCalls {
  register(requestId: string, call: PendingWorkerCall): void;
  take(requestId: string): PendingWorkerCall | undefined;
  rejectAll(error: Error): void;
}

export const createPendingWorkerCalls = (): PendingWorkerCalls => {
  const calls = new Map<string, PendingWorkerCall>();

  const take = (requestId: string): PendingWorkerCall | undefined => {
    const call = calls.get(requestId);
    calls.delete(requestId);
    return call;
  };

  const rejectAll = (error: Error): void => {
    calls.forEach((call) => {
      call.cleanup();
      call.reject(error);
    });
    calls.clear();
  };

  return {
    register: (requestId, call) => calls.set(requestId, call),
    take,
    rejectAll,
  };
};
