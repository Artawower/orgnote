import { RouteNames } from 'orgnote-api';
import { api } from 'src/boot/api';
import { useServerEnvironmentStore } from 'src/stores/server-environment';
import { canUseRemoteAccountFeatures } from './server-capabilities';

export const guardActivationRoute = async () => {
  const serverEnvironment = useServerEnvironmentStore();
  await serverEnvironment.load();
  const user = api.core.useAuth().user;
  return canUseRemoteAccountFeatures(user, serverEnvironment.isSelfHosted)
    ? { name: RouteNames.Home }
    : true;
};
