import type { Command, OrgNoteApi } from 'orgnote-api';
import {
  DefaultCommands,
  EDITOR_COMMAND_GROUP,
  KEYBINDING_CONTEXTS,
  getParentDir,
  join,
} from 'orgnote-api';
import type { OrgNode } from 'org-mode-ast';
import { NodeType } from 'org-mode-ast';
import { openInternalLinkCompletion } from 'src/composables/internal-link-completion';
import { editOrgDocument, to } from 'orgnote-api/utils';
import { cursorLineDown, cursorLineUp, redo, undo } from '@codemirror/commands';
import type { EditorView } from '@codemirror/view';
import { useOrgEditor, isEditorActive } from 'src/composables/use-org-editor';
import { getActiveFilePath } from 'src/utils/get-active-file-path';
import { blurEditor, suspendEditorInput, resumeEditorInput } from 'src/utils/editor-primitives';
import { androidOnly } from 'src/utils/platform-specific';
import { startKeyboardHideWindow } from 'src/utils/android-keyboard-hide';
import { isRootPropertySequenceStart } from 'src/extensions/org-property-drawer/property-source';
import { requestPropertyAddRow } from 'src/extensions/org-property-drawer/property-panel-state';
import { createAddTitleCommand } from './title-command';

const isEditorNotActive = (api: OrgNoteApi): boolean => !isEditorActive(api);
const isKeyboardClosed = (api: OrgNoteApi): boolean =>
  !api.ui.useKeyboardState().keyboardOpened.value;

const getActiveEditorView = (api: OrgNoteApi): EditorView | undefined => {
  const editorStore = api.core.useEditor();
  const ctx = editorStore.activeContext;
  if (!ctx) return undefined;
  return ctx.editorViewGetter();
};

const withEditorView = (api: OrgNoteApi, fn: (view: EditorView) => void): void => {
  const view = getActiveEditorView(api);
  if (!view) return;
  fn(view);
};

const findRootPropertyNode = (root: OrgNode | undefined): OrgNode | undefined => {
  if (!root) return undefined;
  return root.childrenList.find(
    (node) =>
      node.is(NodeType.PropertyDrawer) ||
      (node.is(NodeType.Property) && isRootPropertySequenceStart(node)),
  );
};

const findHeadlinePropertyDrawer = (headline: OrgNode | undefined): OrgNode | undefined =>
  headline?.section?.childrenList.find((node) => node.is(NodeType.PropertyDrawer));

const hasActiveHeadline = (api: OrgNoteApi): boolean => {
  const view = getActiveEditorView(api);
  if (!view) return false;
  let hasHeadline = false;
  editOrgDocument(view.state.doc.toString(), (doc) => {
    hasHeadline = Boolean(doc.headlineAt(view.state.selection.main.head));
  });
  return hasHeadline;
};

const isHeadlinePropertyUnavailable = (api: OrgNoteApi): boolean => !hasActiveHeadline(api);

const addPageProperty = (api: OrgNoteApi): void => {
  api.core.useEditor().editActiveDocument(({ doc }) => {
    const propertyNode = findRootPropertyNode(doc.root);
    const drawerStateKey = `page:${propertyNode?.start ?? 0}`;
    doc.properties.ensure();
    requestPropertyAddRow(drawerStateKey);
  });
};

const addHeadlineProperty = (api: OrgNoteApi): void => {
  api.core.useEditor().editActiveDocument(({ doc, cursorPosition }) => {
    const headline = doc.headlineAt(cursorPosition);
    if (!headline) return;
    const drawer = findHeadlinePropertyDrawer(headline.node);
    const fallbackStart = headline.node.section?.start ?? cursorPosition;
    const drawerStateKey = `headline:${drawer?.start ?? fallbackStart}`;
    headline.properties.ensure();
    requestPropertyAddRow(drawerStateKey);
  });
};

const addActiveProperty = (api: OrgNoteApi): void => {
  if (hasActiveHeadline(api)) {
    addHeadlineProperty(api);
    return;
  }
  addPageProperty(api);
};

export const getEditorCommands = (): Command[] => {
  const commands: Command[] = [
    {
      command: DefaultCommands.EDITOR_UNDO,
      icon: 'sym_o_undo',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => withEditorView(api, undo),
    },
    {
      command: DefaultCommands.EDITOR_REDO,
      icon: 'sym_o_redo',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => withEditorView(api, redo),
    },
    createAddTitleCommand(),
    {
      command: DefaultCommands.EDITOR_INSERT_HEADLINE,
      icon: 'sym_o_title',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.toggleHeadline()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_CODE_BLOCK,
      icon: 'sym_o_code_blocks',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.insertCodeBlock()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_QUOTE,
      icon: 'sym_o_format_quote',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.insertQuote()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_LATEX,
      icon: 'sym_o_function',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.insertLatex()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_LINK,
      icon: 'sym_o_link',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: async (api) => {
        const { orgEditor } = useOrgEditor(api);
        if (!orgEditor) return;

        const clipboardResult = await to(navigator.clipboard.readText.bind(navigator.clipboard))();
        const clipboardText = clipboardResult.isOk() ? clipboardResult.value : '';
        const isUrl = /^https?:\/\//.test(clipboardText);

        orgEditor.insertLink(isUrl ? clipboardText : '');
      },
    },
    {
      command: DefaultCommands.EDITOR_INSERT_INTERNAL_LINK,
      icon: 'sym_o_hub',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: async (api) => {
        const { orgEditor } = useOrgEditor(api);
        if (!orgEditor) return;

        await openInternalLinkCompletion(api, orgEditor);
      },
    },
    {
      command: DefaultCommands.EDITOR_INSERT_IMAGE,
      icon: 'sym_o_image',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: async (api) => {
        const { orgEditor } = useOrgEditor(api);
        if (!orgEditor) return;

        const file = await api.utils.uploadFile({ accept: 'image/*' });
        if (!file) return;

        const currentPath = getActiveFilePath(api);
        if (!currentPath) return;

        const targetDir = getParentDir(currentPath);
        const targetPath = join(targetDir, file.name);

        const fileSystem = api.core.useFileSystem();
        const content = new Uint8Array(await file.arrayBuffer());
        await fileSystem.writeFile(targetPath, content);

        orgEditor.insertImage(file.name);
      },
    },
    {
      command: DefaultCommands.EDITOR_INSERT_BOLD,
      icon: 'sym_o_format_bold',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.bold()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_ITALIC,
      icon: 'sym_o_format_italic',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.italic()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_STRIKETHROUGH,
      icon: 'sym_o_format_strikethrough',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.strikethrough()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_INLINE_CODE,
      icon: 'sym_o_code',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.code()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_BULLET_LIST,
      icon: 'sym_o_format_list_bulleted',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.toggleBulletList()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_NUMERIC_LIST,
      icon: 'sym_o_format_list_numbered',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.toggleNumericList()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_CHECK_LIST,
      icon: 'sym_o_checklist',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.toggleCheckboxList()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_HORIZONTAL_RULE,
      icon: 'sym_o_horizontal_rule',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.insertHorizontalRule()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_HTML_BLOCK,
      icon: 'sym_o_html',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.insertHtmlBlock()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_TABLE,
      icon: 'sym_o_grid_on',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.insertTable()),
    },
    {
      command: DefaultCommands.EDITOR_INSERT_TAG,
      icon: 'sym_o_tag',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => {
        const view = getActiveEditorView(api);
        if (!view) return;

        const editorStore = api.core.useEditor();
        const orgNode = editorStore.activeContext?.orgNode;
        if (!orgNode) return;

        const keywords = orgNode.children?.filter((c) => c.type === 'keyword') ?? [];
        const filetagKeyword = keywords.find(
          (k) => k.children?.first?.rawValue?.toLowerCase().startsWith('#+filetags:') ?? false,
        );
        const titleKeyword = keywords.find(
          (k) => k.children?.first?.rawValue?.toLowerCase().startsWith('#+title:') ?? false,
        );

        if (filetagKeyword) {
          view.dispatch({
            selection: { anchor: filetagKeyword.end, head: filetagKeyword.end },
            scrollIntoView: true,
          });
          return;
        }

        if (titleKeyword) {
          const filetagsTemplate = '\n#+FILETAGS: ::';
          const cursorPositionInTemplate = filetagsTemplate.length - 1;
          view.dispatch({
            changes: {
              from: titleKeyword.end,
              to: titleKeyword.end,
              insert: filetagsTemplate,
            },
            selection: {
              anchor: titleKeyword.end + cursorPositionInTemplate,
              head: titleKeyword.end + cursorPositionInTemplate,
            },
            scrollIntoView: true,
          });
        }
      },
    },
    {
      command: DefaultCommands.EDITOR_INSERT_DATETIME,
      icon: 'sym_o_calendar_today',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => useOrgEditor(api).withOrgEditor((e) => e.insertDatetime()),
    },
    {
      command: DefaultCommands.EDITOR_ADD_PROPERTY,
      icon: 'sym_o_tune',
      group: EDITOR_COMMAND_GROUP,
      interactive: true,
      keybindingContext: KEYBINDING_CONTEXTS.SHELL,
      defaultHotkeys: [{ key: 'p', modifiers: ['Mod', 'Alt'] }],
      hide: isEditorNotActive,
      handler: addActiveProperty,
    },
    {
      command: DefaultCommands.EDITOR_ADD_PAGE_PROPERTY,
      icon: 'sym_o_tune',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: addPageProperty,
    },
    {
      command: DefaultCommands.EDITOR_ADD_HEADLINE_PROPERTY,
      icon: 'sym_o_tune',
      group: EDITOR_COMMAND_GROUP,
      hide: isHeadlinePropertyUnavailable,
      handler: addHeadlineProperty,
    },
    {
      command: DefaultCommands.EDITOR_CARET_UP,
      icon: 'sym_o_keyboard_arrow_up',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => withEditorView(api, cursorLineUp),
    },
    {
      command: DefaultCommands.EDITOR_CARET_DOWN,
      icon: 'sym_o_keyboard_arrow_down',
      group: EDITOR_COMMAND_GROUP,
      hide: isEditorNotActive,
      handler: (api) => withEditorView(api, cursorLineDown),
    },
    {
      command: DefaultCommands.EDITOR_HIDE_KEYBOARD,
      icon: 'sym_o_keyboard_hide',
      group: EDITOR_COMMAND_GROUP,
      hide: isKeyboardClosed,
      handler: async (api) => {
        withEditorView(api, blurEditor);
        await androidOnly(async () => {
          const { Keyboard } = await import('@capacitor/keyboard');
          withEditorView(api, suspendEditorInput);
          startKeyboardHideWindow(() => withEditorView(api, resumeEditorInput));
          await Keyboard.hide();
        })();
      },
    },
  ];

  return commands;
};
