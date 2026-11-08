<template>
  <template v-if="actualType === 'union'">
    <menu-item
      @click="fieldSet(props.name, option.literal)"
      v-for="(option, k) of actualScheme.options"
      :key="k"
      :selected="fieldModel === option.literal"
      :active="fieldModel === option.literal"
    >
      <div class="capitalize menu-item-content">
        {{ option.literal }}
      </div>
    </menu-item>
  </template>
  <template v-else-if="actualType === 'array'">
    <menu-item v-for="(_, i) of fieldModel as unknown[]" :key="i">
      <input-field
        :model-value="(fieldModel as (string | number | undefined)[])[i]"
        @update:model-value="setArrayItem(i, $event)"
        :type="actualScheme.type"
        :name="name"
        ref="editInputRef"
      />
      <template #right>
        <action-button
          class="action-btn"
          @click="removeFromArray(i)"
          icon="delete"
          size="sm"
          outline
          hover-color="red"
        ></action-button>
      </template>
    </menu-item>
    <menu-item type="info" @click="addValueToArray">
      {{ t(I18N.ADD) }}
    </menu-item>
  </template>
  <template v-else-if="metadata?.filePicker">
    <menu-item @click="pickFile">
      <div class="capitalize text-medium menu-item-content">
        {{ camelCaseToWords(name) }}
      </div>
      <template #right>
        <app-flex gap="xs" align-center>
          <overflow-line class="file-picker-value text-medium">{{
            fieldModel ?? metadata.defaultValue ?? ''
          }}</overflow-line>
          <action-button
            v-if="isOptional && fieldModel != null"
            icon="sym_o_backspace"
            size="sm"
            outline
            @click.stop="clearValue"
          />
          <action-button icon="sym_o_description" size="sm" outline @click.stop="pickFile" />
        </app-flex>
      </template>
    </menu-item>
  </template>
  <template v-else-if="metadata?.directoryPicker">
    <menu-item @click="pickDirectory">
      <div class="capitalize text-medium menu-item-content">
        {{ camelCaseToWords(name) }}
      </div>
      <template #right>
        <app-flex gap="xs" align-center>
          <overflow-line class="file-picker-value text-medium">{{
            fieldModel ?? ''
          }}</overflow-line>
          <action-button icon="folder_open" size="sm" outline @click.stop="pickDirectory" />
        </app-flex>
      </template>
    </menu-item>
  </template>
  <template v-else-if="metadata?.textarea">
    <menu-item @click="onItemClick" :placeholder="camelCaseToWords(name)">
      <app-description padded>{{ camelCaseToWords(name) }}</app-description>
      <app-text-area ref="editInputRef" v-model="fieldModel as string"></app-text-area>
    </menu-item>
    <menu-item @click="uploadConfigFile" v-if="metadata.upload" type="info">
      {{ t(I18N.UPLOAD) }} {{ camelCaseToWords(name) }}
    </menu-item>
  </template>
  <menu-item
    v-else
    @click="onItemClick"
    :path="getNestedPath(name)"
    :key="name"
    :prefer="inputSchemeType ? 'right' : 'left'"
  >
    <div v-if="!metadata?.textarea" class="capitalize text-medium menu-item-content">
      {{ camelCaseToWords(name) }}
    </div>
    <template #right>
      <toggle-button
        @click.prevent
        v-if="actualType === 'boolean'"
        v-model="fieldModel as boolean"
        @click="ensureValue"
      />
      <div v-else-if="inputSchemeType" class="input-wrapper">
        <input-field
          v-model="fieldModel as string"
          :textRight="true"
          :type="inputFieldType"
          :password-toggle="isPasswordField"
          :name="name"
          ref="editInputRef"
          @focus="ensureValue"
          class="settings-input"
        />
      </div>
      <div v-if="isOptional && fieldModel == null" class="optional-indicator">
        <span class="text-grey-6">{{ camelCaseToWords('optional') }}</span>
      </div>
    </template>
  </menu-item>
</template>

<script lang="ts" setup>
import MenuItem from './MenuItem.vue';
import ToggleButton from 'src/components/ToggleButton.vue';
import InputField from 'src/components/InputField.vue';
import ActionButton from 'src/components/ActionButton.vue';

import { I18N, type DiskFile } from 'orgnote-api';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';
import { api } from 'src/boot/api';
import { computed, inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ValibotScheme } from 'src/models/valibot-scheme';
import AppTextArea from './AppTextArea.vue';
import AppDescription from 'src/components/AppDescription.vue';
import AppFlex from 'src/components/AppFlex.vue';
import { isPresent, to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { matchesAllowedExtension } from 'src/utils/matches-allowed-extension';
import { isPathInsideRoot } from 'src/utils/is-path-inside-root';

// TODO: refactor this component to be more modular and less monolithic.
// It currently handles a lot of different input types and behaviors, which makes it hard to maintain.
const props = defineProps<{
  path: string;
  name: string;
  scheme: ValibotScheme;
}>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { config } = api.core.useConfig() as Record<string, any>;
const getNestedPath = (path: string) => `${props.path}.${path}`;

import type { SectionAccessor } from 'src/models/settings-section-accessor';
import { SETTINGS_SECTION_INJECT_KEY } from 'src/models/settings-section-accessor';
import OverflowLine from 'src/components/OverflowLine.vue';

const accessor = inject<SectionAccessor | null>(SETTINGS_SECTION_INJECT_KEY, null);

const fieldGet = (key: string): unknown =>
  accessor ? accessor.get(key) : config[props.path]?.[key];

const fieldSet = (key: string, val: unknown): void => {
  if (accessor) {
    accessor.set(key, val);
    return;
  }
  config[props.path][key] = val;
};

const fieldModel = computed({
  get: () => fieldGet(props.name),
  set: (val) => fieldSet(props.name, val),
});

const editInputRef = ref<typeof InputField>();

const onItemClick = () => {
  ensureValue();
  editInputRef.value?.focus();
  if (actualType.value === 'boolean') {
    fieldSet(props.name, !fieldGet(props.name));
  }
};

const setArrayItem = (index: number, val: unknown): void => {
  const arr = [...((fieldGet(props.name) as unknown[]) ?? [])];
  arr[index] = val;
  fieldSet(props.name, arr);
};

const addValueToArray = (): void => {
  if (actualType.value !== 'array') return;
  ensureValue();
  fieldSet(props.name, [...((fieldGet(props.name) as unknown[]) ?? []), '']);
};

const removeFromArray = (index: number): void => {
  const arr = [...((fieldGet(props.name) as unknown[]) ?? [])];
  arr.splice(index, 1);
  fieldSet(props.name, arr);
};

const ensureRootPath = async (): Promise<boolean> => {
  if (!metadata?.ensureRootPath || !metadata.rootPath) return true;

  const fs = api.core.useFileSystem();
  const existing = await to(fs.fileInfo.bind(fs))(metadata.rootPath);
  if (existing.isOk() && existing.value?.type === 'directory') return true;
  if (existing.isOk() && existing.value) return false;

  const created = await to(fs.mkdir.bind(fs))(metadata.rootPath);
  if (created.isOk()) return true;

  reporter.reportError(created.error);
  return false;
};

const validatePickerInput = async (
  mode: 'file' | 'directory',
  value: string,
): Promise<{ valid: true } | { valid: false; message: string }> => {
  if (!value) return { valid: false, message: 'Path is required' };
  if (metadata?.rootPath && !isPathInsideRoot(value, metadata.rootPath)) {
    return { valid: false, message: `Path must be inside ${metadata.rootPath}` };
  }
  if (mode === 'file' && value.endsWith('/')) {
    return { valid: false, message: 'File path is required' };
  }
  if (mode === 'file' && !matchesAllowedExtension(value, metadata?.allowedExtensions)) {
    return { valid: false, message: 'File extension is not allowed' };
  }
  if (mode === 'file' && metadata?.createIfMissing === false) {
    const fs = api.core.useFileSystem();
    const existing = await to(fs.fileInfo.bind(fs))(value);
    if (existing.isErr() || existing.value?.type !== 'file') {
      return { valid: false, message: 'File does not exist' };
    }
  }
  return { valid: true };
};

const pickPath = async (mode: 'file' | 'directory'): Promise<void> => {
  const isReady = await ensureRootPath();
  if (!isReady) return;

  const { createDirItemsGetter } = await import('src/utils/dir-items-getter');
  const result = await api.core.useCompletion().open<DiskFile, string>({
    type: 'input-choice',
    searchText: (fieldGet(props.name) as string) ?? metadata?.rootPath ?? '/',
    placeholder: camelCaseToWords(props.name),
    validateInput: (value) => validatePickerInput(mode, value),
    itemsGetter: createDirItemsGetter(api, {
      includeFiles: mode === 'file',
      rootPath: metadata?.rootPath,
      allowedExtensions: metadata?.allowedExtensions,
      recursive: metadata?.recursive,
    }),
  });
  if (!result) return;
  if (mode === 'directory') {
    const fileManager = api.core.useFileManager();
    await to(fileManager.createFolder.bind(fileManager))(result);
    fieldSet(props.name, result);
    return;
  }
  if (metadata?.createIfMissing === false) {
    fieldSet(props.name, result);
    return;
  }
  const { ensureFileExists } = await import('src/utils/ensure-file-exists');
  const ok = await ensureFileExists(api.core.useFileContent(), result);
  if (!ok) return;
  fieldSet(props.name, result);
};

const clearValue = (): void => fieldSet(props.name, undefined);

const pickFile = (): Promise<void> => pickPath('file');
const pickDirectory = (): Promise<void> => pickPath('directory');

const uploadConfigFile = async () => {
  const command = metadata?.command;
  if (command) {
    const result = await to(() => api.core.useCommands().execute(command))();
    if (result.isErr()) reporter.reportError(result.error);
    return;
  }
  const file = await api.utils.uploadFile();
  fieldSet(props.name, await file?.text());
};

const metadata = props.scheme.pipe?.find((e) => e.type === 'metadata')?.metadata;

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const isLiteralUnion = (s: ValibotScheme): boolean =>
  s.type === 'union' && !!s.options?.length && s.options.every((o) => o.type === 'literal');

const normalizedScheme = computed((): ValibotScheme => {
  if (props.scheme.type !== 'optional' || !props.scheme.wrapped) return props.scheme;
  return props.scheme.wrapped;
});

const actualType = computed(() => {
  const s = normalizedScheme.value;
  if (isLiteralUnion(s)) return 'union';
  if (s.type !== 'union') return s.type;
  const primaryOption = s.options?.find((o) => o.type !== 'literal');
  return primaryOption?.type ?? s.type;
});

const actualScheme = normalizedScheme;

const isOptional = computed(() => props.scheme.type === 'optional');

const DEFAULT_VALUES_BY_TYPE: Record<string, unknown> = {
  boolean: false,
  string: '',
  number: 0,
  array: [],
};

const getDefaultValueForType = (type: string): unknown => DEFAULT_VALUES_BY_TYPE[type];

const ensureValue = (): void => {
  if (!isOptional.value) return;
  if (isPresent(fieldGet(props.name))) return;

  const defaultValue = getDefaultValueForType(actualType.value);
  if (defaultValue === undefined) return;

  fieldSet(props.name, defaultValue);
};

const inputTypes = ['string', 'number'];
const inputSchemeType = computed(() => inputTypes.includes(actualType.value));

const isPasswordField = computed(() => metadata?.password && actualType.value === 'string');

const inputFieldType = computed<'text' | 'number' | 'password'>(() => {
  if (actualType.value === 'number') return 'number';
  if (isPasswordField.value) return 'password';
  return 'text';
});
</script>

<style lang="scss" scoped>
.action-btn {
  opacity: 0;
  pointer-events: none;
  background-color: var(--menu-item-hover-bg);
}

@media (hover: hover) and (pointer: fine) {
  .menu-item:hover {
    .action-btn {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

textarea {
  min-height: calc(4 * var(--menu-item-height));
}

.optional-controls {
  display: flex;
  align-items: center;
  gap: var(--gap-xs);

  .reset-btn {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
}

@media (hover: hover) and (pointer: fine) {
  .menu-item:hover .optional-controls .reset-btn {
    opacity: 1;
  }
}

.optional-indicator {
  font-size: var(--font-size-sm);
  font-style: italic;
}

.input-wrapper {
  width: 100%;
}

.file-picker-value {
  flex: 1;
  text-align: right;
  color: var(--text-secondary, var(--q-secondary));
  font-size: var(--font-size-sm);
}
</style>
