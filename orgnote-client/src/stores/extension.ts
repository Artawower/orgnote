import { defineStore } from 'pinia';
import {
  ExtensionParsingError,
  type Extension,
  type ExtensionManifest,
  type ExtensionMeta,
  type ExtensionSource,
  type ExtensionSourceInfo,
  type ExtensionStore,
  type GitSource,
  type LocalSource,
} from 'orgnote-api';
import { ref, computed, type ComputedRef } from 'vue';
import { api } from 'src/boot/api';
import { extensionTimer } from 'src/boot/perf-timer';
import {
  compileExtension,
  parseExtension,
  parseExtensionFromFile,
} from 'src/utils/read-extension';
import { reporter } from 'src/boot/report';
import { to } from 'orgnote-api/utils';
import { useFileSystemStore } from './file-system';
import { parseToml, stringifyToml } from 'orgnote-api/utils';
import { resetCSSVariables } from 'src/utils/css-utils';
import { THEME_VARIABLES } from 'orgnote-api';
import { useConfigStore } from './config';
import { Dark } from 'quasar';
import { ORGNOTE_EXTENSIONS_FILE_PATH } from 'src/constants/system-file-paths';
import { BUILTIN_LOADERS, BUILTIN_META } from 'src/extensions';
import {
  useExtensionRuntimeFiles,
  type ExtensionRuntimeAsset,
} from 'src/composables/use-extension-runtime-files';
import { registerExtensionWorkers } from 'src/extensions/extension-workers';
import { fetchExtensionPackageInWorker } from 'src/extensions/extension-installer-client';
import type { FetchedExtensionPackage } from 'src/extensions/extension-installer-contract';

interface ActiveExtension extends ExtensionMeta {
  module: Extension;
  releaseWorkers: () => void;
}

interface ExtensionsFile {
  extensions: ExtensionMeta[];
}

interface FetchedExtension {
  manifest: ExtensionManifest;
  rawContent: string;
  assets: readonly ExtensionRuntimeAsset[];
}

type SourceFetcher = (source: ExtensionSourceInfo) => Promise<FetchedExtension>;

const extensionsFilePath = ORGNOTE_EXTENSIONS_FILE_PATH;

const applyMissingDefaults = (
  stored: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> => ({ ...defaults, ...stored });

export const useExtensionsStore = defineStore<'extension', ExtensionStore>('extension', () => {
  const extensions = ref<ExtensionMeta[]>([]);
  const activeExtensions = ref<ActiveExtension[]>([]);
  const fileSystem = useFileSystemStore();
  const runtimeFiles = useExtensionRuntimeFiles();

  const loading = ref<number>(0);
  const ready = computed(() => loading.value <= 0);

  const safeParseToml = to(parseToml, (e) => new SyntaxError('Invalid TOML format', { cause: e }));
  const safeStringifyToml = to(
    stringifyToml,
    (e) => new Error('Failed to stringify TOML', { cause: e }),
  );

  const sync = async (): Promise<void> => {
    loading.value++;

    const runSync = to(
      () =>
        extensionTimer.measure('sync', async () => {
          await readFromDisk();
          registerBuiltinExtensions();
          await mountActiveExtensions();
        }),
      'Failed to sync extensions',
    );

    const result = await runSync();
    loading.value--;

    if (result.isErr()) {
      reporter.reportError(result.error);
    }
  };

  const registerBuiltinExtensions = (): void => {
    const newBuiltins = BUILTIN_META.filter(
      (meta) => !extensions.value.some((e) => e.manifest.name === meta.manifest.name),
    );
    extensions.value.push(...newBuiltins);
  };

  const writeToDisk = async (): Promise<void> => {
    const data: ExtensionsFile = { extensions: extensions.value };
    const safeWrite = to(fileSystem.writeFile, 'Failed to write extensions.toml');

    const res = safeStringifyToml(data).asyncAndThen((content) =>
      safeWrite(extensionsFilePath, content),
    );

    const result = await res;
    if (result.isErr()) {
      reporter.reportError(result.error);
    }
  };

  const readFromDisk = async (): Promise<void> => {
    const safeRead = to(fileSystem.readFile, 'Failed to read extensions.toml');

    const res = await safeRead(extensionsFilePath, 'utf8');

    if (res.isErr()) {
      return;
    }

    const content = res.value;
    if (!content) {
      return;
    }

    const parseResult = safeParseToml(content as string);
    if (parseResult.isErr()) {
      reporter.reportError(parseResult.error);
      return;
    }

    const data = parseResult.value as unknown as ExtensionsFile;
    extensions.value = data.extensions ?? [];
  };

  const mountActiveExtensions = async (): Promise<void> => {
    const activeExtensionsMeta = extensions.value.filter((meta) => meta.active);

    const mountPromises = activeExtensionsMeta.map((meta) => mountExtension(meta));

    await Promise.allSettled(mountPromises);
  };

  const restoreGitRuntime = async (meta: ExtensionMeta): Promise<Extension | undefined> => {
    if (meta.manifest.source.type !== 'git') return undefined;
    const fetched = await fetchFromGit(meta.manifest.source);
    await runtimeFiles.write(fetched.manifest, fetched.rawContent, fetched.assets);
    return compileExtension(fetched.rawContent);
  };

  const compileFromRepository = async (meta: ExtensionMeta): Promise<Extension | undefined> => {
    const runtimeContent = await runtimeFiles.readEntry(meta.manifest);
    if (runtimeContent) return compileExtension(runtimeContent);

    const restoredModule = await restoreGitRuntime(meta);
    if (restoredModule) return restoredModule;

    const source = await api.infrastructure.extensionSourceRepository.get(meta.manifest.name);
    if (!source) {
      return undefined;
    }

    const safeCompile = to(compileExtension, 'Failed to load extension');
    const moduleContent = decodeURIComponent(source.module);
    const compileResult = await safeCompile(moduleContent);
    if (compileResult.isErr()) {
      reporter.reportError(compileResult.error);
      return undefined;
    }

    await runtimeFiles.write(meta.manifest, moduleContent, []);
    return compileResult.value;
  };

  const getExtensionModule = (meta: ExtensionMeta): Promise<Extension | undefined> =>
    BUILTIN_LOADERS[meta.manifest.name]?.() ?? compileFromRepository(meta);

  const syncExtensionConfig = async (meta: ExtensionMeta, module: Extension): Promise<void> => {
    if (!module.defaultSettings) return;
    const merged = applyMissingDefaults(meta.config ?? {}, module.defaultSettings);
    if (JSON.stringify(merged) === JSON.stringify(meta.config ?? {})) return;
    meta.config = merged;
    await writeToDisk();
  };

  const callOnMounted = async (module: Extension, name: string): Promise<boolean> => {
    const safeMounted = to(module.onMounted.bind(module), `Failed to mount extension ${name}`);
    const result = await safeMounted(api);
    if (result.isErr()) {
      reporter.reportError(result.error);
      return false;
    }
    return true;
  };

  const mountExtension = async (meta: ExtensionMeta): Promise<ActiveExtension | undefined> =>
    extensionTimer.measure(`mount:${meta.manifest.name}`, async () => {
      const existing = activeExtensions.value.find((e) => e.manifest.name === meta.manifest.name);
      if (existing) return existing;

      const module = await getExtensionModule(meta);
      if (!module) return undefined;

      await syncExtensionConfig(meta, module);

      const releaseWorkers = registerExtensionWorkers(meta.manifest);
      const mounted = await callOnMounted(module, meta.manifest.name);
      if (!mounted) {
        releaseWorkers();
        return undefined;
      }

      const activeExt: ActiveExtension = {
        manifest: meta.manifest,
        active: true,
        config: meta.config,
        module,
        releaseWorkers,
      };
      activeExtensions.value.push(activeExt);
      return activeExt;
    });

  const unmountExtension = async (extensionName: string): Promise<void> => {
    return extensionTimer.measure(`unmount:${extensionName}`, async () => {
      const ext = activeExtensions.value.find((e) => e.manifest.name === extensionName);
      if (!ext) {
        return;
      }

      if (ext.module?.onUnmounted) {
        const safeUnmount = to(
          ext.module.onUnmounted.bind(ext.module),
          'Failed to unmount extension',
        );
        const result = await safeUnmount(api);

        if (result.isErr()) {
          reporter.reportError(result.error);
        }
      }

      ext.releaseWorkers();

      activeExtensions.value = activeExtensions.value.filter(
        (e) => e.manifest.name !== extensionName,
      );
    });
  };

  const isThemeExtension = (manifest: ExtensionManifest): boolean => {
    return (manifest.category ?? '').toLowerCase() === 'theme';
  };

  const disableOtherThemes = async (currentThemeName: string): Promise<void> => {
    const otherActiveThemes = extensions.value.filter(
      (e) => e.active && isThemeExtension(e.manifest) && e.manifest.name !== currentThemeName,
    );

    await Promise.allSettled(otherActiveThemes.map((t) => unmountExtension(t.manifest.name)));
    otherActiveThemes.forEach((t) => {
      t.active = false;
    });
  };

  const setConfigThemeName = (themeName: string | null): void => {
    const { config } = useConfigStore();
    if (Dark.isActive) {
      config.ui.darkThemeName = themeName;
      return;
    }
    config.ui.lightThemeName = themeName;
  };

  const handleThemeActivation = async (extensionName: string): Promise<void> => {
    await disableOtherThemes(extensionName);
    resetCSSVariables([...THEME_VARIABLES]);
    setConfigThemeName(extensionName);
  };

  const handleThemeDeactivation = (extensionName: string): void => {
    const { config } = useConfigStore();
    const isCurrentDarkTheme = Dark.isActive && config.ui.darkThemeName === extensionName;
    const isCurrentLightTheme = !Dark.isActive && config.ui.lightThemeName === extensionName;
    if (!isCurrentDarkTheme && !isCurrentLightTheme) {
      return;
    }
    resetCSSVariables([...THEME_VARIABLES]);
    setConfigThemeName(null);
  };

  const enableExtension = async (extensionName: string): Promise<void> => {
    const meta = extensions.value.find((e) => e.manifest.name === extensionName);
    if (!meta) {
      reporter.reportWarning(`Extension ${extensionName} not found`);
      return;
    }

    if (meta.active) {
      return;
    }

    if (isThemeExtension(meta.manifest)) {
      await handleThemeActivation(extensionName);
    }

    await mountExtension(meta);
    meta.active = true;
    await writeToDisk();
  };

  const disableExtension = async (extensionName: string): Promise<void> => {
    const meta = extensions.value.find((e) => e.manifest.name === extensionName);
    if (!meta) {
      reporter.reportWarning(`Extension ${extensionName} not found`);
      return;
    }

    if (isThemeExtension(meta.manifest)) {
      handleThemeDeactivation(extensionName);
    }

    await unmountExtension(extensionName);
    meta.active = false;
    await writeToDisk();
  };

  const isExtensionExist = (extensionName: string): boolean =>
    extensions.value.some((e) => e.manifest.name === extensionName);

  const replaceExtensionMeta = (replacement: ExtensionMeta): void => {
    const otherExtensions = extensions.value.filter(
      (extension) => extension.manifest.name !== replacement.manifest.name,
    );
    extensions.value = [...otherExtensions, replacement];
  };

  const rollbackFailedActivation = async (previous?: ExtensionMeta): Promise<void> => {
    if (!previous) return;
    replaceExtensionMeta(previous);
    if (previous.active) await mountExtension(previous);
  };

  const activateExtensionMeta = async (meta: ExtensionMeta): Promise<boolean> => {
    const previous = extensions.value.find((e) => e.manifest.name === meta.manifest.name);
    const shouldActivate = meta.active === true;
    if (previous?.active) await unmountExtension(previous.manifest.name);
    replaceExtensionMeta(meta);
    if (shouldActivate) {
      meta.active = false;
      const mountResult = await to(
        mountExtension,
        `Failed to activate extension ${meta.manifest.name}`,
      )(meta);
      if (mountResult.isErr()) reporter.reportError(mountResult.error);
      meta.active = mountResult.isOk() && mountResult.value !== undefined;
    }
    if (shouldActivate && !meta.active) await rollbackFailedActivation(previous);
    await writeToDisk();
    return !shouldActivate || meta.active === true;
  };

  const addExtension = async (meta: ExtensionMeta, source: ExtensionSource): Promise<void> => {
    const safeUpsert = to(
      api.infrastructure.extensionSourceRepository.upsert,
      'Failed to save extension source',
    );
    const upsertResult = await safeUpsert(source);
    if (upsertResult.isErr()) {
      reporter.reportError(upsertResult.error);
      return;
    }
    await activateExtensionMeta(meta);
  };

  const extractManifestFromModule = async (moduleContent: string): Promise<ExtensionManifest> =>
    (await parseExtension(moduleContent)).manifest;

  const resolveFetchedPackage = async (
    source: GitSource,
    fetched: FetchedExtensionPackage,
  ): Promise<FetchedExtension> => {
    if (fetched.manifest) return { ...fetched, manifest: fetched.manifest };
    const legacyManifest = await extractManifestFromModule(fetched.rawContent);
    return { ...fetched, manifest: { ...legacyManifest, source } };
  };

  const fetchFromGit = async (source: GitSource): Promise<FetchedExtension> => {
    const configStore = useConfigStore();
    const fetched = await fetchExtensionPackageInWorker(api.core.useWorkers(), {
      source,
      corsProxy: configStore.config.developer.corsProxy,
    });
    return await resolveFetchedPackage(source, fetched);
  };

  const sourceFetchers: Record<ExtensionSourceInfo['type'], SourceFetcher> = {
    git: (source) => fetchFromGit(source as GitSource),
    local: () => {
      throw new Error('Local extensions cannot be installed via installExtension');
    },
    builtin: () => {
      throw new Error('Builtin extensions cannot be installed via installExtension');
    },
  };

  const isSameRuntimeVersion = (
    current: ExtensionMeta | undefined,
    manifest: ExtensionManifest,
  ): boolean => current?.manifest.version === manifest.version;

  const removeRuntimeSafely = async (manifest: ExtensionManifest): Promise<void> => {
    const removeResult = await to(
      runtimeFiles.remove,
      `Failed to remove extension runtime ${manifest.name}@${manifest.version}`,
    )(manifest);
    if (removeResult.isErr()) reporter.reportError(removeResult.error);
  };

  const activateFetchedExtension = async (
    fetched: FetchedExtension,
    previous?: ExtensionMeta,
  ): Promise<boolean> => {
    await runtimeFiles.write(fetched.manifest, fetched.rawContent, fetched.assets);
    const activated = await activateExtensionMeta({ manifest: fetched.manifest, active: true });
    if (activated && previous) await removeRuntimeSafely(previous.manifest);
    return activated;
  };

  const installFetchedExtension = async (fetched: FetchedExtension): Promise<void> => {
    const previous = extensions.value.find(
      (extension) => extension.manifest.name === fetched.manifest.name,
    );
    if (isSameRuntimeVersion(previous, fetched.manifest)) return;

    const installResult = await to(
      () => activateFetchedExtension(fetched, previous),
      `Failed to install extension ${fetched.manifest.name}`,
    )();

    if (installResult.isOk() && installResult.value) return;
    if (installResult.isErr()) reporter.reportError(installResult.error);
    await removeRuntimeSafely(fetched.manifest);
  };

  const installExtension = async (source: ExtensionSourceInfo): Promise<void> => {
    const fetcher = sourceFetchers[source.type];
    const fetchResult = await to(fetcher, 'Failed to fetch extension')(source);

    if (fetchResult.isErr()) {
      reporter.reportError(fetchResult.error);
      return;
    }

    await installFetchedExtension(fetchResult.value);
  };

  const deleteExtension = async (extensionName: string): Promise<void> => {
    await unmountExtension(extensionName);
    await runtimeFiles.removeAll(extensionName);

    const safeDelete = to(
      api.infrastructure.extensionSourceRepository.delete,
      'Failed to delete extension source',
    );
    const deleteResult = await safeDelete(extensionName);

    if (deleteResult.isErr()) {
      reporter.reportError(deleteResult.error);
    }

    extensions.value = extensions.value.filter((e) => e.manifest.name !== extensionName);
    await writeToDisk();
  };

  const importExtension = async (file: File): Promise<void> => {
    const safeParse = to(parseExtensionFromFile, (e: unknown) => {
      const error = e instanceof Error ? e : new Error(String(e));
      return new ExtensionParsingError(file.name, { cause: error });
    });
    const parseResult = await safeParse(file);

    if (parseResult.isErr()) {
      reporter.reportError(parseResult.error);
      return;
    }

    const { manifest, rawContent } = parseResult.value;
    if (manifest.assets?.length) {
      reporter.reportError(
        new Error('Extensions with package assets must be installed from a Git source'),
      );
      return;
    }

    const localSource: LocalSource = { type: 'local' };
    manifest.source = localSource;
    manifest.development = true;

    const meta: ExtensionMeta = {
      manifest,
      active: true,
      uploaded: true,
    };

    await runtimeFiles.write(manifest, rawContent, []);
    const activated = await activateExtensionMeta(meta);
    if (!activated) await runtimeFiles.remove(manifest);
  };

  const enableSafeMode = async (): Promise<void> => {
    const nonLocalExtensions = activeExtensions.value.filter(
      (ext) => ext.manifest.source.type !== 'local',
    );

    const unmountPromises = nonLocalExtensions.map((ext) => unmountExtension(ext.manifest.name));
    await Promise.allSettled(unmountPromises);
  };

  const disableSafeMode = async (): Promise<void> => {
    const activeExtensionsMeta = extensions.value.filter((meta) => meta.active);
    const mountPromises = activeExtensionsMeta.map((meta) => mountExtension(meta));
    await Promise.allSettled(mountPromises);
  };

  const getExtensionConfig = (name: string): ComputedRef<Readonly<Record<string, unknown>>> =>
    computed(() => {
      const ext = extensions.value.find((e) => e.manifest.name === name);
      return (ext?.config ?? {}) as Readonly<Record<string, unknown>>;
    });

  const setExtensionConfig = async (
    name: string,
    config: Record<string, unknown>,
  ): Promise<void> => {
    const ext = extensions.value.find((e) => e.manifest.name === name);
    if (!ext) return;
    ext.config = config;
    await writeToDisk();
  };

  const hasExtensionSettings = (name: string): boolean =>
    !!activeExtensions.value.find((e) => e.manifest.name === name)?.module?.settingsSchema;

  const getActiveExtensionModule = (name: string): Extension | undefined =>
    activeExtensions.value.find((e) => e.manifest.name === name)?.module;

  const store: ExtensionStore = {
    extensions,
    ready,

    sync,
    enableExtension,
    disableExtension,
    isExtensionExist,
    addExtension,
    installExtension,
    importExtension,
    deleteExtension,
    enableSafeMode,
    disableSafeMode,
    getExtensionConfig,
    setExtensionConfig,
    hasExtensionSettings,
    getActiveExtensionModule,
  };

  return store;
});
