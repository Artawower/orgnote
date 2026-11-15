import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { getParentDir, join } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { insertTemplate } from 'src/utils/editor-primitives';

const IMAGE_LINK_PREFIX = '[[./';
const IMAGE_LINK_SUFFIX = ']]';

const MIME_EXT_MAP: Record<string, string> = {
  jpeg: 'jpg',
  'svg+xml': 'svg',
};

const normalizeExt = (mime: string): string => {
  const raw = mime.split('/')[1] ?? 'png';
  return MIME_EXT_MAP[raw] ?? raw;
};

const extractImageFile = (event: ClipboardEvent): File | null => {
  const items = Array.from(event.clipboardData?.items ?? []);
  const imageItem = items.find((item) => item.type.startsWith('image/'));
  if (imageItem) return imageItem.getAsFile();
  const files = Array.from(event.clipboardData?.files ?? []);
  return files.find((f) => f.type.startsWith('image/')) ?? null;
};

const buildImageFilename = (file: File): string => {
  const ext = normalizeExt(file.type);
  const id = crypto.randomUUID().slice(0, 8);
  return `image-${id}.${ext}`;
};

const writeImageToFilesystem = async (file: File, filePath: string): Promise<string> => {
  const targetDir = getParentDir(filePath);
  const filename = buildImageFilename(file);
  const targetPath = join(targetDir, filename);
  const content = new Uint8Array(await file.arrayBuffer());
  await api.core.useFileSystem().writeFile(targetPath, content);
  return filename;
};

const insertImageLink = (view: EditorView, filename: string): void => {
  const template = `${IMAGE_LINK_PREFIX}${filename}${IMAGE_LINK_SUFFIX}`;
  insertTemplate(view, { template, focusOffset: IMAGE_LINK_PREFIX.length, overrideLine: true });
};

const handleImagePaste = async (
  file: File,
  filePath: string,
  view: EditorView,
  filePathGetter: () => string | undefined,
): Promise<void> => {
  const result = await to(writeImageToFilesystem)(file, filePath);
  if (!result.isOk()) {
    reporter.reportError('Image paste failed', result.error);
    return;
  }
  if (filePathGetter() !== filePath) return;
  insertImageLink(view, result.value);
};

export const createImagePasteExtension = (
  filePathGetter: () => string | undefined,
): Extension =>
  EditorView.domEventHandlers({
    paste: (event: ClipboardEvent, view: EditorView): boolean => {
      const file = extractImageFile(event);
      if (!file) return false;

      const filePath = filePathGetter();
      if (!filePath) return false;

      event.preventDefault();
      void handleImagePaste(file, filePath, view, filePathGetter);
      return true;
    },
  });
