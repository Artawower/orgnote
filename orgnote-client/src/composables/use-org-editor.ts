import type { OrgNoteApi } from 'orgnote-api';
import { createOrgEditing } from 'src/utils/org-editing';

type OrgEditingApi = ReturnType<typeof createOrgEditing>;

interface UseOrgEditorResult {
  orgEditor: OrgEditingApi | undefined;
  withOrgEditor: (fn: (editor: OrgEditingApi) => void) => void;
}

const getEditorContext = (api: OrgNoteApi) => {
  const editorStore = api.core.useEditor();
  const ctx = editorStore.activeContext;
  if (!ctx) return undefined;

  const view = ctx.editorViewGetter();
  if (!view) return undefined;

  return { view, orgNode: ctx.orgNode ?? undefined };
};

export const useOrgEditor = (api: OrgNoteApi): UseOrgEditorResult => {
  const ctx = getEditorContext(api);

  const orgEditor = ctx ? createOrgEditing(ctx.view, ctx.orgNode) : undefined;

  const withOrgEditor = (fn: (editor: OrgEditingApi) => void): void => {
    const currentCtx = getEditorContext(api);
    if (!currentCtx) return;

    const editor = createOrgEditing(currentCtx.view, currentCtx.orgNode);
    fn(editor);
  };

  return { orgEditor, withOrgEditor };
};

export const isEditorActive = (api: OrgNoteApi): boolean => {
  const ctx = getEditorContext(api);
  return ctx !== undefined;
};
