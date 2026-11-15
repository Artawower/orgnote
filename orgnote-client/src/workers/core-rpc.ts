import type { OrgNoteCoreApi } from 'orgnote-api';
import { CORE_RPC_OPERATION } from './core-rpc-contract';
import { WorkerProtocolError } from './worker-errors';
import type { WorkerCoreCall, WorkerLogMessage } from './worker-protocol';

export const dispatchCoreRpc = async (
  api: OrgNoteCoreApi,
  message: WorkerCoreCall,
): Promise<unknown> => {
  if (message.operation === CORE_RPC_OPERATION.READ_FILE) {
    return await api.files.readFile(message.input.path, message.input.encoding);
  }
  if (message.operation === CORE_RPC_OPERATION.WRITE_FILE) {
    await api.files.writeFile(message.input.path, message.input.content);
    return undefined;
  }
  if (message.operation === CORE_RPC_OPERATION.READ_DIR) {
    return await api.files.readDir(message.input.path);
  }
  if (message.operation === CORE_RPC_OPERATION.FILE_INFO) {
    return await api.files.fileInfo(message.input.path);
  }
  throw new WorkerProtocolError('Worker Core API operation is not available');
};

export const dispatchWorkerLog = (api: OrgNoteCoreApi, message: WorkerLogMessage): void => {
  api.logger[message.level](message.message, message.fields);
};
