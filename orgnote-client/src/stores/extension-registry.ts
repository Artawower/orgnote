import { defineStore } from 'pinia';
import type {
  ExtensionManifest,
  ExtensionRegistryStore,
  GitFile,
  GitRepoHandle,
  ProcessCallback,
  QueueProcessTask,
} from 'orgnote-api';
import { ref, watch } from 'vue';
import { useConfigStore } from './config';
import { useGitStore } from './git';
import { useQueueStore } from './queue';
import { reporter } from 'src/boot/report';
import { validateManifest } from 'src/utils/validate-manifest';
import {
  RECIPES_FOLDER,
  EXTENSION_REGISTRY_MAX_CONCURRENT,
} from 'src/constants/extension-registry';
import { isPresent } from 'orgnote-api/utils';
import { to } from 'orgnote-api/utils';
import { parseConfig, isSupportedConfigFile } from 'src/utils/config-parsers';

const isRecipeFile = (entry: GitFile): boolean =>
  entry.type === 'file' && isSupportedConfigFile(entry.path);

export const useExtensionRegistryStore = defineStore<'extension-registry', ExtensionRegistryStore>(
  'extension-registry',
  () => {
    const availableExtensions = ref<ExtensionManifest[]>([]);
    const loading = ref(false);

    const configStore = useConfigStore();
    const gitStore = useGitStore();

    const fetchManifestsFromSource = async (sourceUrl: string): Promise<ExtensionManifest[]> => {
      const repoHandle = await gitStore.openRepo({ url: sourceUrl });
      const hasRecipes = await repoHandle.fileExists(RECIPES_FOLDER);

      if (!hasRecipes) {
        return [];
      }

      return await readRecipesFromRepo(repoHandle);
    };

    const readRecipesFromRepo = async (repoHandle: GitRepoHandle): Promise<ExtensionManifest[]> => {
      const entries = await repoHandle.listDirectory(RECIPES_FOLDER);
      const recipeFiles = entries.filter(isRecipeFile);

      const manifestPromises = recipeFiles.map(async (file) => {
        const content = await repoHandle.readFile(file.path, 'utf8');
        return safeParseManifest(content, file.path);
      });

      const results = await Promise.all(manifestPromises);
      return results.filter(isPresent);
    };

    const safeParseManifest = (
      content: string,
      filePath: string,
    ): ExtensionManifest | undefined => {
      const safeParse = to(
        () => parseConfig<ExtensionManifest>(content, filePath),
        `Invalid manifest format in ${filePath}`,
      );

      const result = safeParse();

      if (result.isErr()) {
        reporter.reportWarning(result.error.message);
        return;
      }

      const safeValidate = to(
        () => validateManifest(result.value),
        `Invalid manifest in ${filePath}`,
      );
      const validateResult = safeValidate();

      if (validateResult.isErr()) {
        reporter.reportWarning(validateResult.error.message);
        return;
      }

      return result.value;
    };

    const createSourceProcessor = () => {
      return async (
        task: QueueProcessTask<string>,
        cb: ProcessCallback<ExtensionManifest[]>,
      ) => {
        const source = task.payload;
        const safeFetch = to(fetchManifestsFromSource, `Failed to fetch from ${source}`);
        const result = await safeFetch(source);

        if (result.isErr()) {
          reporter.reportWarning(result.error.message);
          cb(undefined, []);
          return;
        }

        cb(undefined, result.value);
      };
    };

    const fetchManifests = async (sources: string[]): Promise<ExtensionManifest[]> => {
      const queueStore = useQueueStore();

      const results = await queueStore.executeBatchTasks<string, ExtensionManifest[]>(
        {
          concurrent: EXTENSION_REGISTRY_MAX_CONCURRENT,
          process: createSourceProcessor(),
        },
        sources,
      );

      return results.flat();
    };

    const refresh = async (): Promise<void> => {
      const sources = configStore.config.extensions?.sources ?? [];

      if (sources.length === 0) {
        availableExtensions.value = [];
        return;
      }

      loading.value = true;
      availableExtensions.value = await fetchManifests(sources);
      loading.value = false;
    };

    watch(
      () => configStore.config.extensions?.sources,
      () => refresh(),
      { deep: true },
    );

    const store: ExtensionRegistryStore = {
      availableExtensions,
      loading,
      refresh,
    };

    return store;
  },
);
