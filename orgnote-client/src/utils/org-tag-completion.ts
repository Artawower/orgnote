import type { CompletionItemRenderer, OrgNoteApi } from 'orgnote-api';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import TagCompletionItem from 'src/containers/TagCompletionItem.vue';

type TranslateFn = (key: string) => string;

const collectKnownTags = async (api: OrgNoteApi): Promise<string[]> => {
  const files = await api.core.useFileMeta().getAll();
  const tagSet = new Set<string>();
  files.forEach((f: { tags?: string[] }) => (f.tags ?? []).forEach((t: string) => tagSet.add(t)));
  return [...tagSet].sort();
};

export const openOrgTagCompletion = async (
  api: OrgNoteApi,
  t: TranslateFn,
  currentTag?: string,
): Promise<string | null> => {
  const completion = api.core.useCompletion();
  const tags = await collectKnownTags(api);

  const candidates = tags.map((tag) => ({
    icon: 'sym_o_label' as const,
    title: tag,
    data: tag,
    commandHandler: (val: string) => completion.close(val),
  }));

  return completion.open<string, string>({
    type: 'choice',
    placeholder: t(extensionI18nKeys.orgAgendaQuickAddTagTooltip),
    itemRenderer: TagCompletionItem as unknown as CompletionItemRenderer<string>,
    searchText: currentTag,
    itemsGetter: async (filter) => ({
      total: candidates.length,
      result: filter
        ? candidates.filter((c) => c.title.toLowerCase().includes(filter.toLowerCase()))
        : candidates,
    }),
  });
};
