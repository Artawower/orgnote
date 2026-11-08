import { safeParse } from 'valibot';
import { AUTH_ENVIRONMENTS, AUTH_STATE_SCHEMA, type AuthEnvironment, type AuthState } from '../models/auth-state';
import { to } from './to-error';

export const DEFAULT_AUTH_STATE: AuthState = { environment: 'web' };

export const isAuthEnvironment = (value: string | undefined): value is AuthEnvironment =>
  Boolean(value && AUTH_ENVIRONMENTS.includes(value as AuthEnvironment));

export const decodeAuthState = (rawState: string): AuthState => {
  if (!rawState) return DEFAULT_AUTH_STATE;

  const safeJsonParse = to(() => JSON.parse(rawState) as unknown);
  const parsed = safeJsonParse();
  if (parsed.isErr()) return DEFAULT_AUTH_STATE;

  const validated = safeParse(AUTH_STATE_SCHEMA, parsed.value);
  if (!validated.success) return DEFAULT_AUTH_STATE;
  return validated.output;
};

export const encodeAuthState = (state: AuthState): string => JSON.stringify(state);

