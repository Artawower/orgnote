export const RoutePaths = {
  AUTH_LOGIN: 'auth',
  AUTH_ACTIVATE: 'auth/activate',
} as const;

export type RoutePath = (typeof RoutePaths)[keyof typeof RoutePaths];
