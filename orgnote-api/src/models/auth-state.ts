import {
  literal,
  object,
  optional,
  string,
  union,
  type InferOutput,
} from 'valibot';

export const AUTH_ENVIRONMENTS = ['web', 'mobile', 'electron', 'desktop'] as const;
export type AuthEnvironment = (typeof AUTH_ENVIRONMENTS)[number];

export const AUTH_ENVIRONMENT_SCHEMA = union([
  literal('web'),
  literal('mobile'),
  literal('electron'),
  literal('desktop'),
]);

export const AUTH_STATE_SCHEMA = object({
  environment: AUTH_ENVIRONMENT_SCHEMA,
  redirectUrl: optional(string()),
});

export type AuthState = InferOutput<typeof AUTH_STATE_SCHEMA>;
