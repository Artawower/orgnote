import type { OrgNoteApi } from 'orgnote-api';
import { useServerEnvironmentStore } from 'src/stores/server-environment';
import { canUseRemoteAccountFeatures } from 'src/utils/server-capabilities';

export const isNotAuthenticated = (api: OrgNoteApi): boolean => {
  const auth = api.core.useAuth();
  return !auth.user;
};

export const isNotActiveUser = (api: OrgNoteApi): boolean => {
  const auth = api.core.useAuth();
  return !canUseRemoteAccountFeatures(auth.user, useServerEnvironmentStore().isSelfHosted);
};

export const isSelfHostedServer = (): boolean =>
  useServerEnvironmentStore().isSelfHosted;

export const isAuthenticated = (api: OrgNoteApi): boolean => {
  const auth = api.core.useAuth();
  return !!auth.user;
};
