import { useFileSystemManagerStore } from 'src/stores/file-system-manager';

export interface FileSystemRootConfigurator {
  readonly reconfigureCurrentFs: () => Promise<void>;
}

export const useFileSystemRootConfigurator = (): FileSystemRootConfigurator => {
  const fsManager = useFileSystemManagerStore();

  const reconfigureCurrentFs = async (): Promise<void> => {
    const root = await fsManager.currentFs?.pickFolder?.();
    if (root === undefined) return;
    await fsManager.useFs(fsManager.currentFsName, root);
  };

  return { reconfigureCurrentFs };
};
