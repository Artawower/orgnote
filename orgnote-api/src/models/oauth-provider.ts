import { OAUTH_PROVIDERS } from 'src/constants';

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
