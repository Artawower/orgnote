import type { CompletionItemRenderer, OrgNoteApi } from 'orgnote-api';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';
import { ORG_PRIORITY_LETTERS } from 'src/constants/org-mode';
import PriorityCompletionItem from 'src/containers/PriorityCompletionItem.vue';

type TranslateFn = (key: string) => string;

const PRIORITY_I18N_SUFFIX_MAP: Record<string, keyof typeof extensionI18nKeys> = {
  A: 'orgAgendaPriorityA',
  B: 'orgAgendaPriorityB',
  C: 'orgAgendaPriorityC',
  D: 'orgAgendaPriorityD',
  E: 'orgAgendaPriorityE',
};

export const openOrgPriorityCompletion = async (
  api: OrgNoteApi,
  t: TranslateFn,
): Promise<string | null> => {
  const completion = api.core.useCompletion();

  const options = [
    ...ORG_PRIORITY_LETTERS.map((letter) => ({
      value: letter,
      label: t(extensionI18nKeys[PRIORITY_I18N_SUFFIX_MAP[letter]!]),
      icon: 'sym_o_flag',
    })),
    { value: '', label: t(extensionI18nKeys.orgAgendaPriorityNone), icon: 'sym_o_flag_circle' },
  ];

  return completion.open<string, string>({
    type: 'choice',
    placeholder: t(extensionI18nKeys.orgAgendaQuickAddPriorityTooltip),
    itemRenderer: PriorityCompletionItem as unknown as CompletionItemRenderer<string>,
    itemsGetter: async () => ({
      total: options.length,
      result: options.map((opt) => ({
        icon: opt.icon,
        title: opt.label,
        data: opt.value,
        commandHandler: (val: string) => completion.close(val),
      })),
    }),
  });
};
