import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { OrgNode } from 'org-mode-ast';
import type { EditorView } from '@codemirror/view';
import type { OrgPropertyEntry } from 'orgnote-api';
import {
  getPropertyEditorState,
  getPropertyScope,
  getPropertyStateKey,
  replacePropertyItems,
} from './property-source';
import {
  formatTags,
  KNOWN_PROPERTY_KEYS,
  parseTags,
  validatePropertyKey,
  validatePropertyValue,
} from './property-model';
import {
  consumePropertyAddRowRequest,
  expandPropertyPanel,
  isPropertyPanelCollapsed,
  propertyAddRowRequests,
  togglePropertyPanel,
} from './property-panel-state';
import {
  iconByKey,
  keyEquals,
  removeItem,
  renameItem,
  upsertItem,
  valueComponent,
} from './property-item-helpers';

interface Props {
  readonly node: OrgNode;
  readonly editorView: EditorView;
  readonly rootNodeSrc: string;
  readonly readonly?: boolean;
  readonly openOnInit?: boolean;
}

interface FocusableControl {
  focus: () => void;
  open?: () => void;
}

type FocusableRefValue = FocusableControl | FocusableControl[] | undefined;
type KeyInputValue = string | string[] | null | undefined;
type TextInputValue = string | undefined;

const toSingleKey = (value: KeyInputValue): string | undefined => {
  if (typeof value !== 'string') return undefined;
  return value.trim();
};

const toTextValue = (value: TextInputValue): string => value ?? '';

export const usePropertyDrawer = (props: Props) => {
  const { t } = useI18n({ useScope: 'global', inheritLocale: true });
  const isAdding = ref(false);
  const draftKey = ref('');
  const draftValue = ref('');
  const error = ref('');
  const refreshTick = ref(0);
  const panelStateTick = ref(0);
  const addKeyInputRef = ref<FocusableControl>();
  const valueInputRef = ref<FocusableControl>();
  const stateKey = computed(() => getPropertyStateKey(props.node));
  const scope = computed(() => getPropertyScope(props.node));
  const anchor = computed(() => props.node.start);

  const state = computed(() =>
    getPropertyEditorState(
      props.editorView,
      scope.value,
      anchor.value,
      `${stateKey.value}:${refreshTick.value}`,
    ),
  );
  const items = computed(() => state.value.items);
  const isEmpty = computed(() => items.value.length === 0);
  const canCollapse = computed(() => !isEmpty.value);

  const isCollapsed = computed(() => {
    if (panelStateTick.value < 0) return false;
    return isPropertyPanelCollapsed(scope.value, stateKey.value, isEmpty.value);
  });

  const collapseIcon = computed(() =>
    isCollapsed.value ? 'sym_o_expand_more' : 'sym_o_expand_less',
  );

  const refreshState = (): void => {
    refreshTick.value += 1;
  };

  const refreshPanelState = (): void => {
    panelStateTick.value += 1;
  };

  const mutateItems = (nextItems: readonly OrgPropertyEntry[]): void => {
    replacePropertyItems(props.editorView, props.node, nextItems, refreshState);
  };

  const setValue = (key: string, value: TextInputValue): void => {
    if (props.readonly) return;
    const nextValue = toTextValue(value);
    const valueError = validatePropertyValue(nextValue);
    error.value = valueError ? t(valueError) : '';
    if (valueError) return;

    const currentItem = items.value.find((item) => keyEquals(item.key, key));
    if (currentItem?.value === nextValue) return;

    mutateItems(upsertItem(items.value, key, nextValue));
  };

  const setKey = (item: OrgPropertyEntry, value: KeyInputValue): void => {
    if (props.readonly) return;
    const key = toSingleKey(value);
    if (key === undefined) return;
    const keyError = validatePropertyKey(key, items.value, item.key);
    error.value = keyError ? t(keyError) : '';
    if (keyError || key === item.key) return;
    mutateItems(renameItem(items.value, item.key, key));
  };

  const focusControl = (control: FocusableRefValue, shouldOpen = false): void => {
    const target = Array.isArray(control) ? control[0] : control;
    if (shouldOpen && target?.open) {
      target.open();
      return;
    }
    target?.focus?.();
  };

  const focusValueInput = (): void => {
    void nextTick(() => focusControl(valueInputRef.value));
  };

  const startAdd = (): void => {
    if (props.readonly) return;
    expandPropertyPanel(scope.value, stateKey.value);
    refreshPanelState();
    if (!isAdding.value) {
      isAdding.value = true;
      draftKey.value = '';
      draftValue.value = '';
      error.value = '';
    }
    void nextTick(() => focusControl(addKeyInputRef.value, true));
  };

  const cancelEdit = (): void => {
    isAdding.value = false;
    error.value = '';
  };

  const commitEdit = (): void => {
    if (props.readonly || !isAdding.value) return;
    const keyError = validatePropertyKey(draftKey.value, items.value);
    const valueError = validatePropertyValue(draftValue.value);
    const validationError = keyError ?? valueError;
    error.value = validationError ? t(validationError) : '';
    if (validationError) return;
    mutateItems(upsertItem(items.value, draftKey.value.trim(), draftValue.value));
    cancelEdit();
  };

  const removeTag = (item: OrgPropertyEntry, tag: string): void => {
    const tags = parseTags(item.value).filter((value) => value !== tag);
    setValue(item.key, formatTags(tags));
  };

  const addTag = (item: OrgPropertyEntry, tag: string): void => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setValue(item.key, formatTags([...parseTags(item.value), trimmed]));
  };

  const startRequestedAdd = (): void => {
    if (!consumePropertyAddRowRequest(stateKey.value)) return;
    startAdd();
  };

  watch(() => props.rootNodeSrc, refreshState);
  watch(
    () => propertyAddRowRequests.value[stateKey.value],
    (requestId) => {
      if (!requestId) return;
      startRequestedAdd();
    },
  );

  onMounted(() => {
    if (props.openOnInit) startAdd();
    startRequestedAdd();
    if (isEmpty.value && !props.readonly) startAdd();
  });


  const expandPanel = (): void => {
    expandPropertyPanel(scope.value, stateKey.value);
    refreshPanelState();
  };

  return {
    addKeyInputRef,
    addTag,
    canCollapse,
    cancelEdit,
    collapseIcon,
    commitEdit,
    draftKey,
    draftValue,
    error,
    expandPanel,
    focusValueInput,
    iconByKey,
    isAdding,
    isCollapsed,
    items,
    knownPropertyKeys: [...KNOWN_PROPERTY_KEYS],
    readonly: props.readonly,
    removeProperty: (key: string) => mutateItems(removeItem(items.value, key)),
    removeTag,
    scope,
    setKey,
    setValue,
    startAdd,
    togglePanel: () => {
      togglePropertyPanel(scope.value, stateKey.value);
      refreshPanelState();
    },
    valueComponent,
    valueInputRef,
  };
};
