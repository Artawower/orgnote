import type { OrgNoteWorkerDefinition } from 'orgnote-api';
import { startWorkerRuntime } from 'src/workers/start-worker-runtime';
import type { ExtensionInstallerWorkerContract } from './extension-installer-contract';
import { fetchExtensionPackageFromGit } from './fetch-extension-package';

const definition: OrgNoteWorkerDefinition<ExtensionInstallerWorkerContract> = {
  methods: {
    fetchPackage: (request) => fetchExtensionPackageFromGit(request),
  },
};

startWorkerRuntime(definition);
