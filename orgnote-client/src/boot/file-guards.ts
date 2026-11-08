import { defineBoot } from '@quasar/app-vite/wrappers';
import { useFileGuardStore } from 'src/stores/file-guard';
import { validateConfigToml } from 'src/utils/validate-config';
import { logger } from './logger';

export default defineBoot(() => {
  logger.info('[FileGuard] Registering system file guards');
  const fileGuards = useFileGuardStore();

  fileGuards.register({
    id: 'extensions-toml',
    matcher: (path: string) => /extensions\.toml$/.test(path),
    readonly: true,
    reason: 'System extension registry file',
    source: 'system',
  });

  fileGuards.register({
    id: 'config-toml',
    matcher: (path: string) => /config\.toml$/.test(path),
    validator: validateConfigToml,
    source: 'system',
  });
  logger.info('[FileGuard] System file guards registered');
});
