import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { debounce } from 'src/utils/debounce';
import {
  isOrgFile,
  i18n,
  parseBufferUri,
  type BufferStore,
  type Buffer as OrgBuffer,
  type BufferGuard,
  type FileSystemChange,
  type BufferScheme,
  type BufferProvider,
} from 'orgnote-api';
import { uint8ArrayToBase64, uint8ArrayToText, textToUint8Array, to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { useFileGuardStore } from './file-guard';
import { DEFAULT_SAVE_DELAY_MS, DEFAULT_VALIDATION_DELAY_MS } from 'src/constants/config';

const SAVE_IGNORE_WINDOW_MS = 300;

const extractErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause instanceof Error) return cause.message;
  return error.message;
};

const incrementBufferReference = (buffer: OrgBuffer): OrgBuffer => {
  buffer.referenceCount += 1;
  buffer.lastAccessed = new Date();
  return buffer;
};

const initValidationLastContent = (buffer: OrgBuffer): void => {
  if (!buffer.guard?.validation) {
    return;
  }
  buffer.guard.validation.lastValidContent = buffer.text;
};

const isRecentlySaved = (buffer: OrgBuffer): boolean => {
  const lastSavedAt = buffer.metadata.lastSavedAt as number | undefined;
  if (!lastSavedAt) {
    return false;
  }
  return Date.now() - lastSavedAt < SAVE_IGNORE_WINDOW_MS;
};

const shouldIgnoreExternalChange = (buffer: OrgBuffer): boolean =>
  buffer.isSaving || isRecentlySaved(buffer);

const areUint8ArraysEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const useBufferStore = defineStore<string, BufferStore>('buffers', (): BufferStore => {
  const buffers = ref<Map<string, OrgBuffer>>(new Map());
  const autoSaveDisposers = new Map<string, () => void>();
  const bufferUnwatchers = new Map<string, () => void>();

  const providerStore = api.core.useBufferProviders();
  const config = api.core.useConfig();

  const syncAfterBufferSave = debounce(async () => {
    const syncStore = api.core.useSync();
    const result = await to(() => syncStore.sync(), 'Failed to sync after buffer save')();
    if (result.isErr()) {
      reporter.reportWarning(result.error);
    }
  }, () => config.config.editor.saveDelayMs ?? DEFAULT_SAVE_DELAY_MS);

  const getProvider = (scheme: BufferScheme): BufferProvider | undefined => providerStore.get(scheme);

  const isBufferDirty = (buffer: OrgBuffer): boolean => {
    const original = buffer.metadata.originalRawContent as Uint8Array | undefined;
    const current = buffer.rawContent;

    if (original === undefined) {
      return current.length > 0;
    }

    return !areUint8ArraysEqual(current, original);
  };

  const saveBuffer = async (buffer: OrgBuffer): Promise<void> => {
    const provider = getProvider(buffer.scheme);
    if (!isBufferDirty(buffer) || !provider?.write) {
      return;
    }

    buffer.isSaving = true;

    const contentToWrite = new Uint8Array(buffer.rawContent);
    const result = await to(provider.write.bind(provider), `Failed to save: ${buffer.uri}`)(
      buffer.path,
      contentToWrite,
    );

    if (result.isErr()) {
      reporter.reportError(result.error);
      buffer.isSaving = false;
      return;
    }

    buffer.metadata.originalRawContent = new Uint8Array(contentToWrite);
    buffer.metadata.lastSavedAt = Date.now();

    if (buffer.scheme === 'file') {
      syncAfterBufferSave();
    }

    buffer.isSaving = false;
  };

  const loadBufferContent = async (buffer: OrgBuffer): Promise<void> => {
    buffer.isLoading = true;

    const provider = getProvider(buffer.scheme);
    if (!provider) {
      const errorMsg = `No provider registered for scheme: ${buffer.scheme}`;
      reporter.reportError(new Error(errorMsg));
      buffer.errors.push(errorMsg);
      buffer.isLoading = false;
      return;
    }

    const result = await to(provider.read.bind(provider), `Failed to load: ${buffer.uri}`)(
      buffer.path,
    );

    if (result.isErr()) {
      reporter.reportError(result.error);
      buffer.errors.push(extractErrorMessage(result.error));
      buffer.isLoading = false;
      return;
    }

    buffer.rawContent = result.value;
    buffer.metadata.originalRawContent = new Uint8Array(result.value);
    buffer.isLoading = false;
  };

  const getSaveDelayMs = (): number => config.config.editor.saveDelayMs ?? DEFAULT_SAVE_DELAY_MS;

  const getValidationDelayMs = (): number =>
    config.config.editor.validationDelayMs ?? DEFAULT_VALIDATION_DELAY_MS;

  const buildBufferGuard = (
    uri: string,
    scheme: BufferScheme,
    path: string,
  ): BufferGuard | undefined => {
    const provider = providerStore.get(scheme);
    const isProviderReadonly = !provider?.write;

    const fileGuardStore = useFileGuardStore();
    const isGuardReadonly = fileGuardStore.isReadOnly(path);
    const hasValidator = !!fileGuardStore.getGuard(path)?.validator;

    const isReadonly = isProviderReadonly || isGuardReadonly;

    if (!isReadonly && !hasValidator) {
      return undefined;
    }

    const reason = isProviderReadonly
      ? i18n.BUFFER_READONLY
      : fileGuardStore.getReadOnlyReason(path);

    return {
      readonly: isReadonly,
      reason,
      validation: hasValidator
        ? { status: 'idle', errors: [], lastValidContent: undefined }
        : undefined,
    };
  };

  const createEmptyBuffer = (uri: string, scheme: BufferScheme, path: string): OrgBuffer => {
    const provider = providerStore.get(scheme);
    const context = provider?.getContext?.(path);

    const state = reactive({
      rawContent: new Uint8Array() as Uint8Array,
    });

    const defaultTitle = path.split('/').pop() || 'Untitled';

    return reactive({
      uri,
      scheme,
      path,
      title: context?.title ?? defaultTitle,
      get rawContent() {
        return state.rawContent;
      },
      set rawContent(value: Uint8Array) {
        state.rawContent = value;
      },
      get text() {
        return uint8ArrayToText(state.rawContent);
      },
      get base64() {
        return uint8ArrayToBase64(state.rawContent);
      },
      setText(value: string) {
        state.rawContent = textToUint8Array(value);
      },
      isSaving: false,
      errors: [],
      isLoading: true,
      lastAccessed: new Date(),
      referenceCount: 1,
      metadata: {},
      guard: buildBufferGuard(uri, scheme, path),
    });
  };

  const validateBufferContent = async (path: string, content: string) => {
    const fileGuardStore = useFileGuardStore();
    return fileGuardStore.validate(path, content);
  };

  const formatValidationErrors = (errors: Array<{ message: string }>): string =>
    errors.map((e) => e.message).join('\n');

  const reportValidationErrors = (errors: Array<{ message: string }>): void => {
    const details = formatValidationErrors(errors);
    reporter.reportWarning(details);
  };

  const validateAndSaveBuffer = async (buffer: OrgBuffer): Promise<void> => {
    const validation = buffer.guard!.validation!;

    validation.status = 'validating';

    const result = await to(validateBufferContent, `Validation failed for: ${buffer.uri}`)(
      buffer.path,
      buffer.text,
    );

    if (result.isErr()) {
      validation.status = 'invalid';
      validation.errors = [{ message: result.error.message, severity: 'error' }];
      reporter.reportError(result.error);
      return;
    }

    validation.errors = result.value;
    validation.status = result.value.length === 0 ? 'valid' : 'invalid';

    if (result.value.length > 0) {
      reportValidationErrors(result.value);
      return;
    }

    await saveBuffer(buffer);
    validation.lastValidContent = buffer.text;
  };

  const registerAutoSaveDisposer = (
    uri: string,
    stopWatcher: () => void,
    cancelPending: () => void,
  ): void => {
    autoSaveDisposers.set(uri, () => {
      stopWatcher();
      cancelPending();
    });
  };

  const setupValidatedAutoSave = (buffer: OrgBuffer): void => {
    const debouncedValidateAndSave = debounce(
      () => validateAndSaveBuffer(buffer),
      getValidationDelayMs(),
    );
    const stopWatcher = watch(() => buffer.base64, debouncedValidateAndSave);
    registerAutoSaveDisposer(buffer.uri, stopWatcher, debouncedValidateAndSave.cancel);
  };

  const setupRegularAutoSave = (buffer: OrgBuffer): void => {
    const debouncedSave = debounce(() => saveBuffer(buffer), getSaveDelayMs());
    const stopWatcher = watch(() => buffer.base64, debouncedSave);
    registerAutoSaveDisposer(buffer.uri, stopWatcher, debouncedSave.cancel);
  };

  const setupAutoSave = (buffer: OrgBuffer): void => {
    if (buffer.guard?.readonly) {
      return;
    }
    if (buffer.guard?.validation) {
      return setupValidatedAutoSave(buffer);
    }
    setupRegularAutoSave(buffer);
  };

  const handleExternalChange = async (
    buffer: OrgBuffer,
    change: FileSystemChange,
  ): Promise<void> => {
    if (shouldIgnoreExternalChange(buffer) || isBufferDirty(buffer)) {
      return;
    }

    if (change.type === 'delete') {
      buffer.errors.push(i18n.FILE_DELETED_EXTERNALLY);
      return;
    }

    await loadBufferContent(buffer);
  };

  const setupWatcher = (buffer: OrgBuffer): (() => void) | undefined => {
    const provider = providerStore.get(buffer.scheme);
    if (!provider?.watch) {
      return undefined;
    }
    return provider.watch(buffer.path, (change) => void handleExternalChange(buffer, change));
  };

  const allBuffers = computed(() => Array.from(buffers.value.values()));

  const touchFileMeta = async (path: string): Promise<void> => {
    if (!isOrgFile(path)) return;

    const filePath = path.split('/').filter(Boolean);
    const file = await api.infrastructure.fileRepository.getByPath(filePath);
    if (!file) return;

    const result = await to(
      api.infrastructure.fileRepository.save.bind(api.infrastructure.fileRepository),
      `Failed to update touchedAt for file: ${path}`,
    )({
      ...file,
      touchedAt: new Date().toISOString(),
    });

    if (result.isErr()) {
      reporter.reportError(result.error);
    }
  };

  const getOrCreateBuffer = async (uri: string): Promise<OrgBuffer> => {
    const { scheme, path, raw } = parseBufferUri(uri);

    const existing = buffers.value.get(raw);
    if (existing?.errors.length) {
      existing.errors = [];
      await loadBufferContent(existing);
    }
    if (existing) {
      void touchFileMeta(existing.path);
      return incrementBufferReference(existing);
    }
    const buffer = createEmptyBuffer(raw, scheme, path);
    buffers.value.set(raw, buffer);

    await loadBufferContent(buffer);
    initValidationLastContent(buffer);
    setupAutoSave(buffer);
    void touchFileMeta(path);

    const unwatch = setupWatcher(buffer);
    if (unwatch) {
      bufferUnwatchers.set(raw, unwatch);
    }

    return buffer;
  };

  const releaseBuffer = (uri: string): void => {
    const { raw } = parseBufferUri(uri);
    const buffer = buffers.value.get(raw);
    if (!buffer) {
      return;
    }
    buffer.referenceCount = Math.max(0, buffer.referenceCount - 1);
  };

  const getBufferByUri = (uri: string): OrgBuffer | undefined => {
    const { raw } = parseBufferUri(uri);
    return buffers.value.get(raw);
  };

  const saveBufferByUri = async (uri: string): Promise<void> => {
    const buffer = getBufferByUri(uri);
    if (!buffer) {
      return;
    }
    await saveBuffer(buffer);
  };

  const stopWatch = (uri: string): void => {
    bufferUnwatchers.get(uri)?.();
    bufferUnwatchers.delete(uri);
  };

  const stopAutoSave = (uri: string): void => {
    autoSaveDisposers.get(uri)?.();
    autoSaveDisposers.delete(uri);
  };

  const closeBuffer = async (
    uri: string,
    force = false,
    requireUnused = false,
  ): Promise<boolean> => {
    const { raw } = parseBufferUri(uri);
    const buffer = buffers.value.get(raw);
    if (!buffer) {
      return true;
    }
    if (isBufferDirty(buffer) && !force) {
      return false;
    }
    await saveBufferByUri(raw);
    if (requireUnused && buffer.referenceCount > 0) return false;
    buffers.value.delete(raw);
    stopAutoSave(raw);
    stopWatch(raw);
    return true;
  };

  const saveAllBuffers = async (): Promise<void> => {
    await Promise.all(allBuffers.value.map(saveBuffer));
  };

  const cleanupUnusedBuffers = (): void => {
    allBuffers.value
      .filter((b) => b.referenceCount === 0)
      .forEach((b) => void closeBuffer(b.uri, false, true));
  };

  return {
    buffers,
    allBuffers,
    getOrCreateBuffer,
    releaseBuffer,
    closeBuffer,
    getBufferByUri,
    saveAllBuffers,
    cleanup: cleanupUnusedBuffers,
  };
});
