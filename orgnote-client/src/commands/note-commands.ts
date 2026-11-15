import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands, I18N, RouteNames } from 'orgnote-api';
import { useNotePickCompletion } from 'src/composables/file-pick-completion';
import NoteInfoModal from 'src/containers/NoteInfoModal.vue';
import { clearEditorContent } from 'src/utils/editor-primitives';
import { getCurrentNoteInfo } from 'src/utils/current-note-info';

const getCurrentNoteText = (api: OrgNoteApi): string | undefined => {
  const activeContext = api.core.useEditor().activeContext;
  const view = activeContext?.editorViewGetter?.();
  if (view) return view.state.doc.toString();

  const uri = api.core.usePane().activeBufferUri;
  if (uri) {
    const buffer = api.core.useBuffers().getBufferByUri(uri);
    if (buffer) return buffer.text;
  }

  return activeContext?.orgNode?.rawValue;
};

const hasActiveNote = (api: OrgNoteApi): boolean => getCurrentNoteText(api) !== undefined;

export function getNoteCommands(): Command[] {
  const commands: Command[] = [
    {
      command: DefaultCommands.OPEN_NOTE,
      title: DefaultCommands.OPEN_NOTE,
      group: 'note',
      icon: 'sym_o_edit_square',
      handler: async (api: OrgNoteApi, params?: CommandHandlerParams<{ path: string }>) => {
        const path = params?.data?.path ?? (await useNotePickCompletion(api, '/'));

        if (!path) {
          return;
        }

        const bufferViewer = api.core.useBufferViewer();
        await bufferViewer.open(path);
      },
    },
    {
      command: DefaultCommands.PREVIEW_NOTE,
      icon: 'sym_o_image_search',
      group: 'note',
      hide: () => true,
      handler: async (api, params: CommandHandlerParams<{ text: string }>) => {
        const text = params?.data?.text ?? '';
        if (!text.trim()) {
          return;
        }
        const layoutStore = api.core.useLayout();
        const router = api.vue.router;
        if (router.currentRoute.value.name !== RouteNames.Panes) {
          await router.push({ name: RouteNames.Panes });
        }
        await layoutStore.ensureLayout();
        const bufferViewer = api.core.useBufferViewer();
        const uri = api.core.useEmbeddedBuffer().create(text);
        await bufferViewer.open(uri);
      },
    },
    {
      command: DefaultCommands.SHARE_NOTE_ONETIME,
      icon: 'sym_o_ios_share',
      group: 'note',
      handler: async (api) => {
        const { activeContext } = api.core.useEditor();
        const n = api.core.useNotifications();

        if (!activeContext?.orgNode) {
          n.notify({
            level: 'warning',
            message: I18N.NO_SELECTED_NOTE,
          });
          return;
        }

        const payload = {
          command: DefaultCommands.PREVIEW_NOTE,
          data: { text: activeContext?.orgNode?.rawValue },
        };

        const shareUrl = `${window.location.origin}${
          window.location.pathname
        }?execute=${encodeURIComponent(JSON.stringify(payload))}`;

        await api.utils.copyToClipboard(shareUrl);
        n.notify({
          message: I18N.COPIED_TO_CLIPBOARD,
        });
      },
    },
    {
      command: DefaultCommands.COPY_BUFFER_CONTENT,
      title: DefaultCommands.COPY_BUFFER_CONTENT,
      group: 'note',
      icon: 'sym_o_content_copy',
      hide: (api) => !hasActiveNote(api),
      handler: async (api) => {
        const notifications = api.core.useNotifications();
        const text = getCurrentNoteText(api);

        if (text === undefined) {
          notifications.notify({ level: 'warning', message: I18N.NO_SELECTED_NOTE });
          return;
        }

        await api.utils.copyToClipboard(text);
        notifications.notify({ message: I18N.COPIED_TO_CLIPBOARD });
      },
    },
    {
      command: DefaultCommands.CLEAR_NOTE,
      title: DefaultCommands.CLEAR_NOTE,
      group: 'note',
      icon: 'sym_o_delete_sweep',
      hide: (api) => {
        const uri = api.core.usePane().activeBufferUri;
        if (!uri) return true;
        const buffer = api.core.useBuffers().getBufferByUri(uri);
        return !buffer || buffer.guard?.readonly === true;
      },
      handler: async (api) => {
        const view = api.core.useEditor().activeContext?.editorViewGetter?.();

        if (view) {
          clearEditorContent(view);
          return;
        }

        const uri = api.core.usePane().activeBufferUri;
        if (!uri) return;
        const buffer = api.core.useBuffers().getBufferByUri(uri);
        if (!buffer || !buffer.text.length) return;
        buffer.setText('');
      },
    },
    {
      command: DefaultCommands.SHOW_FILE_INFO,
      icon: 'sym_o_info',
      group: 'note',
      handler: async (api) => {
        const notifications = api.core.useNotifications();
        const noteInfo = await getCurrentNoteInfo(api);

        if (!noteInfo) {
          notifications.notify({
            level: 'warning',
            message: I18N.NO_SELECTED_NOTE,
          });
          return;
        }

        api.ui.useModal().open(NoteInfoModal, {
          title: DefaultCommands.SHOW_FILE_INFO,
          modalProps: { noteInfo },
        });
      },
    },
  ];

  return commands;
}
