import type { OrgNoteApi } from 'orgnote-api';
import { parseBufferUri } from 'orgnote-api';

const fileScheme = 'file';

export const getActiveFilePath = (api: OrgNoteApi): string | undefined => {
  const fallbackPath = api.core.useEditor().activeContext?.filePath;
  const routeUri = api.core.usePane().activeBufferUri;

  if (!routeUri) {
    return fallbackPath;
  }

  const parsedUri = parseBufferUri(routeUri);
  if (parsedUri.scheme !== fileScheme) {
    return fallbackPath;
  }

  return parsedUri.path;
};
