import type { DiskFile, OrgNoteApi } from 'orgnote-api';
import { ORGNOTE_SYSTEM_ROOT_PATH } from 'orgnote-api';

export const TEMPLATE_ROOT_PATH = `/${ORGNOTE_SYSTEM_ROOT_PATH}/templates`;
export const TEMPLATE_EXTENSION = '.org.tmpl';
export const DEFAULT_TEMPLATE_PATH = `${TEMPLATE_ROOT_PATH}/default${TEMPLATE_EXTENSION}`;
export const DEFAULT_TEMPLATE_CONTENT = `:PROPERTIES:
:ID: {{uuid()}}
:END:
#+TITLE: {{title}}
`;
const TEMPLATE_ROOT_PREFIX = `${TEMPLATE_ROOT_PATH}/`;

export interface OrgTemplateFile {
  name: string;
  path: string;
}

export const isOrgTemplatePath = (path: string | undefined): path is string => {
  if (!path?.startsWith(TEMPLATE_ROOT_PREFIX)) return false;
  if (!path.endsWith(TEMPLATE_EXTENSION)) return false;
  return !path.slice(TEMPLATE_ROOT_PREFIX.length).includes('/');
};

export const templateTitleFromPath = (path: string): string => {
  const fileName = path.slice(path.lastIndexOf('/') + 1);
  return fileName.endsWith(TEMPLATE_EXTENSION)
    ? fileName.slice(0, -TEMPLATE_EXTENSION.length)
    : fileName;
};

export const createTemplatePath = (name: string): string => {
  const trimmedName = name.trim();
  const fileName = trimmedName.endsWith(TEMPLATE_EXTENSION)
    ? trimmedName
    : `${trimmedName}${TEMPLATE_EXTENSION}`;
  return `${TEMPLATE_ROOT_PATH}/${fileName}`;
};

const isTemplateFile = (file: DiskFile): boolean =>
  file.type === 'file' && isOrgTemplatePath(file.path);

export const ensureTemplateRoot = async (api: OrgNoteApi): Promise<boolean> => {
  const fs = api.core.useFileSystem();
  const existing = await fs.fileInfo(TEMPLATE_ROOT_PATH);
  if (existing?.type === 'directory') return true;
  if (existing) return false;

  await fs.mkdir(TEMPLATE_ROOT_PATH);
  const created = await fs.fileInfo(TEMPLATE_ROOT_PATH);
  return created?.type === 'directory';
};

export const ensureDefaultTemplate = async (api: OrgNoteApi): Promise<boolean> => {
  const rootReady = await ensureTemplateRoot(api);
  if (!rootReady) return false;

  const fs = api.core.useFileSystem();
  const existing = await fs.fileInfo(DEFAULT_TEMPLATE_PATH);
  if (existing && existing.type !== 'file') return false;

  const content = existing ? await fs.readFile(DEFAULT_TEMPLATE_PATH, 'utf8') : '';
  if (content) return true;

  await fs.writeFile(DEFAULT_TEMPLATE_PATH, DEFAULT_TEMPLATE_CONTENT);
  const created = await fs.fileInfo(DEFAULT_TEMPLATE_PATH);
  return created?.type === 'file';
};

export const listOrgTemplates = async (api: OrgNoteApi): Promise<OrgTemplateFile[]> => {
  const rootReady = await ensureTemplateRoot(api);
  if (!rootReady) return [];

  const files = await api.core.useFileSystem().readDir(TEMPLATE_ROOT_PATH);
  return files.filter(isTemplateFile).map((file) => ({
    name: templateTitleFromPath(file.path),
    path: file.path,
  }));
};

export const validateTemplateName = async (
  api: OrgNoteApi,
  name: string,
): Promise<{ valid: true } | { valid: false; message: string }> => {
  const trimmedName = name.trim();
  if (!trimmedName) return { valid: false, message: 'Template name is required' };
  if (trimmedName.includes('/') || trimmedName.includes('\\')) {
    return { valid: false, message: 'Template name must not contain path separators' };
  }

  const templatePath = createTemplatePath(trimmedName);
  const existing = await api.core.useFileSystem().fileInfo(templatePath);
  if (existing) return { valid: false, message: 'Template already exists' };

  return { valid: true };
};
