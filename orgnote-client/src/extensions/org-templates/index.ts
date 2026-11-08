import {
  DefaultCommands,
  isOrgFile,
  type CompletionSearchResult,
  type Command,
  type Extension,
  type OrgNoteApi,
} from 'orgnote-api';
import { metadata, object, optional, pipe, string } from 'valibot';
import { pickNewOrgFilePath } from 'src/composables/create-file-completion';
import { getFileDirPath } from 'src/utils/get-file-dir-path';
import { to } from 'orgnote-api/utils';
import {
  createTemplatePath,
  DEFAULT_TEMPLATE_PATH,
  ensureDefaultTemplate,
  ensureTemplateRoot,
  isOrgTemplatePath,
  listOrgTemplates,
  TEMPLATE_EXTENSION,
  TEMPLATE_ROOT_PATH,
  validateTemplateName,
  type OrgTemplateFile,
} from './template-paths';
import { renderOrgTemplate } from './template-renderer';
import { orgTemplatesManifest } from './manifest';

const CREATE_NOTE_FROM_TEMPLATE_COMMAND = 'create-note-from-template';
const CREATE_ORG_TEMPLATE_COMMAND = 'create-org-template';
const TEMPLATES_COMMAND_GROUP = 'templates';
const DEFAULT_CREATE_NOTE_WRAPPER_ID = 'org-templates.default-create-note';

const settingsSchema = object({
  defaultTemplatePath: pipe(
    optional(string()),
    metadata({
      filePicker: true,
      rootPath: TEMPLATE_ROOT_PATH,
      allowedExtensions: [TEMPLATE_EXTENSION],
      ensureRootPath: true,
      createIfMissing: false,
      recursive: false,
    }),
  ),
});

interface OrgTemplatesConfig {
  defaultTemplatePath?: string;
}

const defaultSettings: Record<string, unknown> = {
  defaultTemplatePath: DEFAULT_TEMPLATE_PATH,
};

const resolveConfig = (rawConfig: Record<string, unknown>): OrgTemplatesConfig => ({
  defaultTemplatePath: rawConfig.defaultTemplatePath as string | undefined,
});

const ensureDefaultTemplateConfig = async (api: OrgNoteApi): Promise<OrgTemplatesConfig> => {
  const extensions = api.core.useExtensions();
  const rawConfig = extensions.getExtensionConfig(orgTemplatesManifest.name).value;
  const defaultPath = rawConfig.defaultTemplatePath as string | undefined;

  const defaultReady = await to(ensureDefaultTemplate)(api);
  const needsDefaultPath = defaultReady.isOk() && defaultReady.value && !isOrgTemplatePath(defaultPath);
  if (!needsDefaultPath) return resolveConfig(rawConfig);

  await extensions.setExtensionConfig(orgTemplatesManifest.name, {
    ...rawConfig,
    defaultTemplatePath: DEFAULT_TEMPLATE_PATH,
  });
  return resolveConfig({ ...rawConfig, defaultTemplatePath: DEFAULT_TEMPLATE_PATH });
};

const openCreatedPath = async (api: OrgNoteApi, path: string): Promise<void> => {
  const fm = api.core.useFileManager();
  fm.path = getFileDirPath(path);
  await api.core.useCommands().execute(DefaultCommands.OPEN_NOTE, { path });
};

const readTemplateContent = async (
  api: OrgNoteApi,
  path: string,
): Promise<string | undefined> => {
  const result = await to(api.core.useFileSystem().readFile)(path, 'utf8');
  if (result.isErr()) return;
  return typeof result.value === 'string' ? result.value : undefined;
};

const createNoteFromContent = async (
  api: OrgNoteApi,
  path: string,
  content: string,
): Promise<string> => {
  await api.core.useFileSystem().writeFile(path, content);
  await openCreatedPath(api, path);
  return path;
};

const pickTemplate = async (api: OrgNoteApi): Promise<OrgTemplateFile | undefined> => {
  const templates = await listOrgTemplates(api);
  if (!templates.length) {
    api.core.useNotifications().notify({
      message: 'No templates found',
      level: 'warning',
    });
    return;
  }

  return await api.core.useCompletion().open<OrgTemplateFile, OrgTemplateFile>({
    type: 'choice',
    placeholder: 'Select template',
    itemsGetter: (query) => getTemplateCandidates(api, templates, query),
  });
};

const getTemplateCandidates = (
  api: OrgNoteApi,
  templates: OrgTemplateFile[],
  query: string,
): CompletionSearchResult<OrgTemplateFile> => {
  const normalizedQuery = query.toLowerCase();
  const result = templates.filter((template) =>
    template.name.toLowerCase().includes(normalizedQuery),
  );

  return {
    total: result.length,
    result: result.map((template) => ({
      title: template.name,
      icon: 'sym_o_description',
      data: template,
      commandHandler: (value) => {
        void api.core.useCompletion().close(value);
      },
    })),
  };
};

const createNoteFromTemplate = async (api: OrgNoteApi): Promise<string | undefined> => {
  const template = await pickTemplate(api);
  if (!template) return;

  const notePath = await pickNewOrgFilePath(api);
  if (!notePath) return;

  const templateContent = await readTemplateContent(api, template.path);
  if (templateContent === undefined) {
    api.core.useNotifications().notify({
      message: 'Template cannot be read',
      level: 'warning',
    });
    return;
  }

  return await createNoteFromContent(api, notePath, renderOrgTemplate(templateContent, notePath));
};

const createOrgTemplate = async (api: OrgNoteApi): Promise<string | undefined> => {
  const rootReady = await ensureTemplateRoot(api);
  if (!rootReady) {
    api.core.useNotifications().notify({
      message: 'Templates directory cannot be created',
      level: 'danger',
    });
    return;
  }

  const name = await api.core.useCompletion().open<unknown, string>({
    type: 'input',
    placeholder: 'Template name',
    validateInput: (value) => validateTemplateName(api, value),
  });
  if (!name) return;

  const path = createTemplatePath(name);
  await api.core.useFileSystem().writeFile(path, '');
  await openCreatedPath(api, path);
  return path;
};

const createDefaultTemplateNote = async (
  api: OrgNoteApi,
  next: () => Promise<string | undefined>,
): Promise<string | undefined> => {
  const config = await ensureDefaultTemplateConfig(api);
  if (!isOrgTemplatePath(config.defaultTemplatePath)) return await next();

  const templateContent = await readTemplateContent(api, config.defaultTemplatePath);
  if (templateContent === undefined) return await next();

  const notePath = await pickNewOrgFilePath(api);
  if (!notePath) return;
  if (!isOrgFile(notePath)) return await createNoteFromContent(api, notePath, '');

  return await createNoteFromContent(api, notePath, renderOrgTemplate(templateContent, notePath));
};

const ORG_TEMPLATE_COMMANDS: Command[] = [
  {
    command: CREATE_NOTE_FROM_TEMPLATE_COMMAND,
    title: 'Create note from template',
    group: TEMPLATES_COMMAND_GROUP,
    icon: 'sym_o_note_add',
    interactive: true,
    handler: createNoteFromTemplate,
  },
  {
    command: CREATE_ORG_TEMPLATE_COMMAND,
    title: 'Create org template',
    group: TEMPLATES_COMMAND_GROUP,
    icon: 'sym_o_post_add',
    interactive: true,
    handler: createOrgTemplate,
  },
];

const unwrapCreateNoteByApi = new WeakMap<OrgNoteApi, () => void>();

export const orgTemplatesExtension: Extension = {
  settingsSchema,
  defaultSettings,
  onMounted: async (api) => {
    await ensureDefaultTemplateConfig(api);

    const commands = api.core.useCommands();
    commands.add(...ORG_TEMPLATE_COMMANDS);
    const unwrapCreateNote = commands.wrap<unknown, string>(DefaultCommands.CREATE_NOTE, {
      id: DEFAULT_CREATE_NOTE_WRAPPER_ID,
      priority: 100,
      handler: ({ next }) => createDefaultTemplateNote(api, next),
    });
    unwrapCreateNoteByApi.set(api, unwrapCreateNote);
  },
  onUnmounted: async (api) => {
    unwrapCreateNoteByApi.get(api)?.();
    unwrapCreateNoteByApi.delete(api);
    api.core.useCommands().remove(...ORG_TEMPLATE_COMMANDS);
  },
};

export { orgTemplatesManifest } from './manifest';
