import {
  DefaultCommands,
  I18N,
  type Command,
  type CompletionCandidate,
  type CompletionItemRenderer,
  type ExtensionMeta,
  type OrgNoteApi,
} from 'orgnote-api';
import Fuse from 'fuse.js';
import { defineAsyncComponent } from 'vue';
import { DEFAULT_FUST_THRESHOLD } from 'src/constants/config';
import ExtensionCompletionItem from 'src/containers/ExtensionCompletionItem.vue';

const ExtensionConfigSettings = defineAsyncComponent(
  () => import('src/containers/ExtensionConfigSettings.vue'),
);

type OpenExtensionSettingsCommandData = {
  readonly extensionName: string;
};

const createExtensionSearch = (
  extensions: ExtensionMeta[],
  threshold: number,
): Fuse<ExtensionMeta> =>
  new Fuse(extensions, {
    threshold,
    keys: ['manifest.name', 'manifest.description', 'manifest.category'],
  });

const searchExtensions = (
  search: Fuse<ExtensionMeta>,
  extensions: ExtensionMeta[],
  query: string,
): ExtensionMeta[] => {
  if (!query.trim()) return extensions;
  return search.search(query).map((result) => result.item);
};

const toggleExtension = async (api: OrgNoteApi, extension: ExtensionMeta): Promise<void> => {
  const extensions = api.core.useExtensions();
  const extensionName = extension.manifest.name;

  if (extension.active) {
    await extensions.disableExtension(extensionName);
    return;
  }

  await extensions.enableExtension(extensionName);
};

const createCandidate = (
  api: OrgNoteApi,
  extension: ExtensionMeta,
): CompletionCandidate<ExtensionMeta> => ({
  title: extension.manifest.name,
  description: extension.manifest.description,
  data: extension,
  commandHandler: () => toggleExtension(api, extension),
});

const createToggleExtensionsCommand = (): Command => ({
  command: DefaultCommands.TOGGLE_EXTENSIONS,
  group: 'settings',
  icon: 'sym_o_extension',
  handler: (api) => {
    const extensions = api.core.useExtensions();
    const threshold =
      api.core.useConfig().config.completion.fuseThreshold ?? DEFAULT_FUST_THRESHOLD;
    const search = createExtensionSearch(extensions.extensions, threshold);

    return api.core.useCompletion().open<ExtensionMeta>({
      name: DefaultCommands.TOGGLE_EXTENSIONS,
      placeholder: I18N.EXTENSIONS,
      type: 'choice',
      itemRenderer: ExtensionCompletionItem as unknown as CompletionItemRenderer<ExtensionMeta>,
      itemsGetter: (filter) => {
        const filteredExtensions = searchExtensions(search, extensions.extensions, filter);

        return {
          result: filteredExtensions.map((extension) => createCandidate(api, extension)),
          total: filteredExtensions.length,
        };
      },
    });
  },
});

const createOpenExtensionSettingsCommand = (): Command<OpenExtensionSettingsCommandData> => ({
  command: DefaultCommands.OPEN_EXTENSION_SETTINGS,
  group: 'settings',
  icon: 'sym_o_settings',
  system: true,
  handler: (api, { data }) => {
    if (!data) return;

    return api.ui.useModal().open(ExtensionConfigSettings, {
      title: data.extensionName,
      closable: true,
      wide: true,
      modalProps: data,
    });
  },
});

export const getExtensionCommands = (): Command[] => [
  createToggleExtensionsCommand(),
  createOpenExtensionSettingsCommand(),
];
