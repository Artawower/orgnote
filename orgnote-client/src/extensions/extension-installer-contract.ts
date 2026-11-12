import type {
  ExtensionManifest,
  GitSource,
  OrgNoteWorkerContract,
  WorkerProcedure,
} from 'orgnote-api';
import type { ExtensionRuntimeAsset } from 'src/composables/use-extension-runtime-files';

export const EXTENSION_INSTALLER_WORKER_ID = 'orgnote.extension-installer';

export interface ExtensionInstallerRequest {
  readonly source: GitSource;
  readonly corsProxy?: string;
}

export interface FetchedExtensionPackage {
  readonly manifest?: ExtensionManifest;
  readonly rawContent: string;
  readonly assets: readonly ExtensionRuntimeAsset[];
}

export interface ExtensionInstallerWorkerContract extends OrgNoteWorkerContract {
  methods: {
    fetchPackage: WorkerProcedure<ExtensionInstallerRequest, FetchedExtensionPackage>;
  };
  events: Record<string, never>;
}
