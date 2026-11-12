import type { SerializedWorkerError } from './worker-protocol';

export class WorkerNotRegisteredError extends Error {
  override readonly name = 'WorkerNotRegisteredError';

  constructor(workerId: string) {
    super(`Worker is not registered: ${workerId}`);
  }
}

export class WorkerAlreadyRegisteredError extends Error {
  override readonly name = 'WorkerAlreadyRegisteredError';

  constructor(workerId: string) {
    super(`Worker is already registered: ${workerId}`);
  }
}

export class WorkerDisposedError extends Error {
  override readonly name = 'WorkerDisposedError';

  constructor() {
    super('Worker handle has been disposed');
  }
}

export class WorkerCallAbortedError extends Error {
  override readonly name = 'AbortError';

  constructor() {
    super('Worker call was aborted');
  }
}

export class WorkerCrashedError extends Error {
  override readonly name = 'WorkerCrashedError';

  constructor(message: string) {
    super(`Worker crashed: ${message}`);
  }
}

export class WorkerRemoteError extends Error {
  override readonly name: string;

  constructor(error: SerializedWorkerError) {
    super(error.message);
    this.name = error.name;
    this.stack = error.stack;
  }
}

export class WorkerProtocolError extends Error {
  override readonly name = 'WorkerProtocolError';

  constructor(message: string) {
    super(message);
  }
}
