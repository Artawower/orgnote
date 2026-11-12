export const buildTaskEditorTitle = (text: string, priority: string | undefined): string =>
  priority ? `[#${priority}] ${text}` : text;
