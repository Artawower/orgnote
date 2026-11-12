import type {
  ExtensionWorkerCapability,
  OrgNoteCoreApi,
} from 'orgnote-api';

export class WorkerCapabilityDeniedError extends Error {
  override readonly name = 'WorkerCapabilityDeniedError';

  constructor(workerId: string, capability: ExtensionWorkerCapability) {
    super(`Worker ${workerId} does not have capability ${capability}`);
  }
}

const denied = <T>(workerId: string, capability: ExtensionWorkerCapability): Promise<T> =>
  Promise.reject(new WorkerCapabilityDeniedError(workerId, capability));

export const restrictCoreApi = (
  api: OrgNoteCoreApi,
  workerId: string,
  capabilities: readonly ExtensionWorkerCapability[],
): OrgNoteCoreApi => {
  const canRead = capabilities.includes('files:read');
  const canWrite = capabilities.includes('files:write');
  return {
    files: {
      readFile: (path, encoding) => canRead
        ? api.files.readFile(path, encoding)
        : denied(workerId, 'files:read'),
      readDir: (path) => canRead
        ? api.files.readDir(path)
        : denied(workerId, 'files:read'),
      fileInfo: (path) => canRead
        ? api.files.fileInfo(path)
        : denied(workerId, 'files:read'),
      writeFile: (path, content) => canWrite
        ? api.files.writeFile(path, content)
        : denied(workerId, 'files:write'),
    },
    logger: api.logger,
  };
};
