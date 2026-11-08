import { OAUTH_PROVIDERS, type OAuthProvider } from 'orgnote-api';

export const isValidAuthProvider = (value: unknown): value is OAuthProvider =>
  typeof value === 'string' && OAUTH_PROVIDERS.includes(value as OAuthProvider);
