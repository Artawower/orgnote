import {
  DefaultCommands,
  I18N,
  KEYBINDING_CONTEXTS,
  RouteNames,
  getFileName,
  join,
  type Command,
  type CommandHandlerParams,
  type FileSortConfig,
  type OrgNoteApi,
  type PendingFileOperation,
} from 'orgnote-api';
import { reporter } from 'src/boot/report';
import { createFileCompletion } from 'src/composables/create-file-completion';
import { createFolderCompletion } from 'src/composables/create-folder-completion';
import { deleteFileCompletion } from 'src/composables/delete-file-completion';
import { useFileRenameCompletion } from 'src/composables/file-rename-completion';
import { getFileDirPath } from 'src/utils/get-file-dir-path';
import { to } from 'orgnote-api/utils';
import {
  FILE_MANAGER_SIDEBAR_CONFIG,
  FileManagerRef as FileManagerComponent,
} from 'src/containers/file-manager-ref';
import { buildSortCandidates } from 'src/composables/sort-files-completion';
import { getActiveFilePath } from 'src/utils/get-active-file-path';
import {
  useTransferDestinationCompletion,
  type TransferDestination,
} from 'src/composables/transfer-destination-completion';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';

const group = 'file manager';

type FileTargetsCommandData = {
  path?: string;
  paths?: string[];
  interactive?: boolean;
};

type DeleteFileCommandData = FileTargetsCommandData & {
  force?: boolean;
};

const getTargetPathsFromCommandData = (data?: FileTargetsCommandData): string[] | undefined => {
  if (data?.paths?.length) {
    return data.paths;
  }

  if (data?.path) {
    return [data.path];
  }
};

const cancelAndThrow = (
  fm: ReturnType<OrgNoteApi['core']['useFileManager']>,
  error: Error,
): never => {
  fm.cancelPending();
  throw error;
};

const pickInteractiveDestination = async (
  api: OrgNoteApi,
  fm: ReturnType<OrgNoteApi['core']['useFileManager']>,
): Promise<TransferDestination | undefined> => {
  const destinationResult = await to(
    useTransferDestinationCompletion,
    'Failed to pick destination',
  )(api, fm.path);

  if (destinationResult.isErr()) {
    return cancelAndThrow(fm, destinationResult.error);
  }

  const destination = destinationResult.value;
  if (!destination) {
    fm.cancelPending();
    return;
  }

  return destination;
};

const executeExplicitTransferIfRequired = async (
  api: OrgNoteApi,
  fm: ReturnType<OrgNoteApi['core']['useFileManager']>,
  pendingOperation: PendingFileOperation | undefined,
  destination: TransferDestination,
): Promise<boolean> => {
  const explicitTransferResult = await to(
    executeExplicitTransfer,
    'Failed to execute pending transfer',
  )(api, pendingOperation, destination);

  if (explicitTransferResult.isErr()) {
    return cancelAndThrow(fm, explicitTransferResult.error);
  }

  if (!explicitTransferResult.value) {
    return false;
  }

  fm.cancelPending();
  return true;
};

const executePendingTransferAndSync = async (
  api: OrgNoteApi,
  fm: ReturnType<OrgNoteApi['core']['useFileManager']>,
  pendingOperation: PendingFileOperation | undefined,
  destination: TransferDestination,
): Promise<void> => {
  const executeResult = await to(
    fm.executePending.bind(fm),
    'Failed to execute pending transfer',
  )(destination.destinationDir);

  if (executeResult.isErr()) {
    return cancelAndThrow(fm, executeResult.error);
  }

  await safeSyncActiveFileAfterMove(api, pendingOperation, destination.destinationDir);
};

const executeInteractiveTransfer = async (
  api: OrgNoteApi,
  pendingOperation: PendingFileOperation | undefined,
): Promise<void> => {
  const fm = api.core.useFileManager();
  const destination = await pickInteractiveDestination(api, fm);
  if (!destination) {
    return;
  }

  const handledByExplicitTransfer = await executeExplicitTransferIfRequired(
    api,
    fm,
    pendingOperation,
    destination,
  );
  if (handledByExplicitTransfer) {
    return;
  }

  await executePendingTransferAndSync(api, fm, pendingOperation, destination);
};

const canTransferToExplicitPath = (
  operation: PendingFileOperation | undefined,
  destination: TransferDestination,
): operation is PendingFileOperation => {
  if (!operation?.paths.length || !destination.explicitFilePath) {
    return false;
  }

  return operation.paths.length === 1;
};

const executeExplicitTransfer = async (
  api: OrgNoteApi,
  operation: PendingFileOperation | undefined,
  destination: TransferDestination,
): Promise<boolean> => {
  if (!canTransferToExplicitPath(operation, destination)) {
    return false;
  }

  const sourcePath = operation.paths[0]!;
  const targetPath = destination.explicitFilePath!;
  const fs = api.core.useFileSystem();
  const transfer = operation.type === 'copy' ? fs.copyFile.bind(fs) : fs.rename.bind(fs);

  const transferResult = await to(transfer, 'Failed to execute pending transfer')(
    sourcePath,
    targetPath,
  );
  if (transferResult.isErr()) {
    throw transferResult.error;
  }

  if (operation.type === 'move') {
    await safeSyncActiveFileAfterRename(api, sourcePath, targetPath);
  }

  return true;
};

const toPathPrefix = (path: string): string => (path.endsWith('/') ? path : `${path}/`);

const remapPath = (
  activePath: string,
  previousPath: string,
  nextPath: string,
): string | undefined => {
  if (activePath === previousPath) {
    return nextPath;
  }

  const previousPrefix = toPathPrefix(previousPath);
  if (!activePath.startsWith(previousPrefix)) {
    return;
  }

  return `${nextPath}${activePath.slice(previousPath.length)}`;
};

const reopenPath = async (api: OrgNoteApi, path: string): Promise<void> => {
  const panes = api.core.usePane();
  const activeTab = panes.activeTab;
  if (activeTab?.router) {
    await activeTab.router.replace({
      name: RouteNames.File,
      params: {
        paneId: activeTab.paneId,
        path,
      },
    });
    return;
  }

  const commands = api.core.useCommands();
  await commands.execute(DefaultCommands.OPEN_NOTE, { path });
};

const syncActiveFileAfterRename = async (
  api: OrgNoteApi,
  previousPath: string,
  nextPath: string,
): Promise<void> => {
  const activePath = getActiveFilePath(api);
  if (!activePath) {
    return;
  }

  const remappedPath = remapPath(activePath, previousPath, nextPath);
  if (!remappedPath) {
    return;
  }

  await reopenPath(api, remappedPath);
};

const safeSyncActiveFileAfterRename = async (
  api: OrgNoteApi,
  previousPath: string,
  nextPath: string,
): Promise<void> => {
  const syncResult = await to(syncActiveFileAfterRename, 'Failed to sync active file after rename')(
    api,
    previousPath,
    nextPath,
  );

  if (syncResult.isErr()) {
    reporter.reportWarning(syncResult.error);
  }
};

const getMoveDestinationPath = (sourcePath: string, destinationDir: string): string =>
  join(destinationDir, getFileName(sourcePath));

const syncActiveFileAfterMove = async (
  api: OrgNoteApi,
  operation: PendingFileOperation | undefined,
  destinationDir: string,
): Promise<void> => {
  if (!operation || operation.type !== 'move') {
    return;
  }

  const activePath = getActiveFilePath(api);
  if (!activePath) {
    return;
  }

  const remappedPath = operation.paths
    .map((sourcePath) => {
      const destinationPath = getMoveDestinationPath(sourcePath, destinationDir);
      return remapPath(activePath, sourcePath, destinationPath);
    })
    .find((path) => !!path);

  if (!remappedPath) {
    return;
  }

  await reopenPath(api, remappedPath);
};

const safeSyncActiveFileAfterMove = async (
  api: OrgNoteApi,
  operation: PendingFileOperation | undefined,
  destinationDir: string,
): Promise<void> => {
  const syncResult = await to(syncActiveFileAfterMove, 'Failed to sync active file after move')(
    api,
    operation,
    destinationDir,
  );

  if (syncResult.isErr()) {
    reporter.reportWarning(syncResult.error);
  }
};

const createTransferHandler =
  (startOperation: (api: OrgNoteApi, targets: string[]) => void) =>
  async (api: OrgNoteApi, params?: CommandHandlerParams<FileTargetsCommandData>): Promise<void> => {
    const fm = api.core.useFileManager();
    const targets = getTargetPathsFromCommandData(params?.data) ?? fm.operationTargets;
    if (!targets.length) return;

    startOperation(api, targets);

    if (!params?.data?.interactive) {
      return;
    }

    await executeInteractiveTransfer(api, fm.pendingOperation);
  };

const OPEN_FILE_MANAGER_NAV_COMMAND = 'open file manager';

export function getFileManagerCommands(): Command[] {
  const commands: Command[] = [
    {
      command: DefaultCommands.MAXIMIZE_FILE_MANAGER,
      group,
      icon: 'sym_o_fit_screen',
      handler: (api: OrgNoteApi) => {
        const modal = api.ui.useModal();
        modal.open(FileManagerComponent, {
          modalProps: {
            closable: true,
          },
          modalEmits: {
            close: () => modal.close(),
          },
        });
      },
    },
    {
      command: DefaultCommands.TOGGLE_FILE_MANAGER,
      group,
      icon: 'folder',
      isActive: (api: OrgNoteApi) => {
        const sidebar = api.ui.useSidebar();
        return sidebar.opened && sidebar.component === FileManagerComponent;
      },
      handler: (api: OrgNoteApi) => {
        const sidebar = api.ui.useSidebar();
        sidebar.openComponent(FileManagerComponent, FILE_MANAGER_SIDEBAR_CONFIG);
      },
    },
    {
      command: OPEN_FILE_MANAGER_NAV_COMMAND,
      icon: 'folder',
      title: extensionI18nKeys.fileManagerNavTitle,
      system: true,
      isActive: (api: OrgNoteApi) => {
        const sidebar = api.ui.useSidebar();
        return sidebar.opened && sidebar.component === FileManagerComponent;
      },
      handler: (api: OrgNoteApi) => {
        const sidebar = api.ui.useSidebar();
        if (sidebar.opened && sidebar.component === FileManagerComponent) return;
        sidebar.openComponent(FileManagerComponent, FILE_MANAGER_SIDEBAR_CONFIG);
      },
    },
    {
      command: DefaultCommands.CREATE_FOLDER,
      group,
      icon: 'sym_o_create_new_folder',
      handler: async (api: OrgNoteApi) => {
        const res = await to(createFolderCompletion, 'Failed to create folder')(api);
        if (res.isErr()) {
          reporter.reportError(res.error);
        }
      },
    },
    {
      command: DefaultCommands.CREATE_NOTE,
      group: 'file manager',
      icon: 'o_add_box',
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.SHELL,
      defaultHotkeys: [{ key: 'n', modifiers: ['Mod'] }],
      handler: async (api: OrgNoteApi) => {
        const fm = api.core.useFileManager();
        const filePath = await createFileCompletion(api);
        if (!filePath) {
          return;
        }
        const dirPath = getFileDirPath(filePath);
        fm.path = dirPath;

        const commands = api.core.useCommands();
        await commands.execute(DefaultCommands.OPEN_NOTE, { path: filePath });
        return filePath;
      },
    },
    {
      command: DefaultCommands.RENAME_FILE,
      group,
      icon: 'sym_o_edit',
      handler: async (api: OrgNoteApi, params: CommandHandlerParams<FileTargetsCommandData>) => {
        const fm = api.core.useFileManager();
        const targetPath = params?.data?.path ?? fm.focusFile?.path;
        if (!targetPath) {
          return;
        }
        const nextPath = await useFileRenameCompletion(api, targetPath);
        if (!nextPath) {
          return;
        }
        await syncActiveFileAfterRename(api, targetPath, nextPath);
      },
    },
    {
      command: DefaultCommands.SHOW_MOBILE_FILE_SEARCH,
      group,
      icon: 'search',
      handler: (api: OrgNoteApi) => {
        const fm = api.core.useFileManager();
        fm.mobileFileSearchActive = true;
      },
      hide: (api: OrgNoteApi) => !api.ui.useScreenDetection().tabletBelow.value,
    },
    {
      command: DefaultCommands.HIDE_MOBILE_FILE_SEARCH,
      group,
      icon: 'close',
      handler: (api: OrgNoteApi) => {
        const fm = api.core.useFileManager();
        fm.mobileFileSearchActive = false;
        fm.searchQuery = '';
      },
      hide: (api: OrgNoteApi) => !api.ui.useScreenDetection().tabletBelow.value,
    },
    {
      command: DefaultCommands.DELETE_FILE,
      group,
      icon: 'sym_o_delete',
      handler: async (api: OrgNoteApi, params: CommandHandlerParams<DeleteFileCommandData>) => {
        const fm = api.core.useFileManager();
        const paths = getTargetPathsFromCommandData(params?.data);
        const targets = paths ?? fm.operationTargets;

        if (!targets.length) {
          await deleteFileCompletion(api);
          return;
        }

        if (params?.data?.force) {
          const fs = api.core.useFileSystem();
          await Promise.all(targets.map((p) => fs.deleteFile(p)));
          fm.clearSelection();
          return;
        }

        return deleteWithConfirmation(api, targets);
      },
    },
    {
      command: DefaultCommands.COPY_FILE,
      group,
      icon: 'sym_o_content_copy',
      handler: createTransferHandler((api, targets) =>
        api.core.useFileManager().startCopy(targets),
      ),
    },
    {
      command: DefaultCommands.MOVE_FILE,
      group,
      icon: 'sym_o_drive_file_move',
      handler: createTransferHandler((api, targets) =>
        api.core.useFileManager().startMove(targets),
      ),
    },
    {
      command: DefaultCommands.EXECUTE_PENDING_FILE_OPERATION,
      group,
      icon: 'sym_o_content_paste',
      handler: async (api: OrgNoteApi) => {
        const fm = api.core.useFileManager();
        const pendingOperation = fm.pendingOperation;
        await fm.executePending(fm.path);
        await safeSyncActiveFileAfterMove(api, pendingOperation, fm.path);
      },
    },
    {
      command: DefaultCommands.CANCEL_PENDING_FILE_OPERATION,
      group,
      icon: 'close',
      handler: (api: OrgNoteApi) => {
        const fm = api.core.useFileManager();
        fm.cancelPending();
      },
    },
    {
      command: DefaultCommands.SELECT_FILE,
      group,
      icon: 'sym_o_check_circle',
      handler: (api: OrgNoteApi, params: CommandHandlerParams<FileTargetsCommandData>) => {
        const fm = api.core.useFileManager();
        const targetPath = params?.data?.path ?? fm.focusFile?.path;
        if (!targetPath) return;

        fm.toggleSelection(targetPath);
      },
    },
    {
      command: DefaultCommands.SELECT_ALL_FILES,
      group,
      icon: 'sym_o_select_all',
      handler: (api: OrgNoteApi) => {
        const fm = api.core.useFileManager();
        fm.selectFiles([...fm.files]);
      },
    },
    {
      command: DefaultCommands.DESELECT_ALL_FILES,
      group,
      icon: 'sym_o_deselect',
      handler: (api: OrgNoteApi) => {
        const fm = api.core.useFileManager();
        fm.clearSelection();
      },
    },
    {
      command: DefaultCommands.REVEAL_IN_FILE_MANAGER,
      group,
      icon: 'sym_o_my_location',
      handler: (api: OrgNoteApi) => {
        const filePath = getActiveFilePath(api);
        if (!filePath) return;
        const fm = api.core.useFileManager();
        fm.path = getFileDirPath(filePath);
        fm.searchQuery = '';
        const sidebar = api.ui.useSidebar();
        if (sidebar.opened && sidebar.component === FileManagerComponent) return;
        sidebar.openComponent(FileManagerComponent, FILE_MANAGER_SIDEBAR_CONFIG);
      },
    },
    {
      command: DefaultCommands.SORT_FILES,
      group,
      icon: 'sym_o_sort',
      handler: (api: OrgNoteApi) => {
        const fm = api.core.useFileManager();
        const completion = api.core.useCompletion();

        completion.open<FileSortConfig>({
          placeholder: I18N.SORT_FILES,
          type: 'choice',
          itemsGetter: () => buildSortCandidates(fm.sortConfig),
        });
      },
    },
  ];

  return commands;
}

const deleteWithConfirmation = async (api: OrgNoteApi, paths: string[]): Promise<void> => {
  const confirmModal = api.ui.useConfirmationModal();
  const message = paths.length === 1 ? paths[0] : `${paths.length} files`;
  const confirmed = await confirmModal.confirm({
    title: I18N.CONFIRM_DELETE_FILE,
    message,
  });

  if (!confirmed) return;

  const fm = api.core.useFileManager();
  await fm.deleteFiles(paths);
};
