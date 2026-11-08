import { toOpenableExternalUrl } from './external-url-policy';

const EXTERNAL_URL_TARGET = '_blank';
const EXTERNAL_URL_FEATURES = 'noopener,noreferrer';

export { toOpenableExternalUrl };

export const isOpenableExternalUrl = (url: string): boolean => Boolean(toOpenableExternalUrl(url));

export const openExternalUrl = (url: string): void => {
  const parsed = toOpenableExternalUrl(url);
  if (!parsed) return;
  window.open(parsed.toString(), EXTERNAL_URL_TARGET, EXTERNAL_URL_FEATURES);
};
