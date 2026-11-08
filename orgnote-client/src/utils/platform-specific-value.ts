import { Platform } from 'quasar';

type PlatformResult<T extends { data?: unknown }> = T extends { data: infer D } ? D : T['data'];

export function platformSpecificValue<T extends { data?: unknown }>(
  datasource: T & {
    nativeMobile?: T['data'];
    electron?: T['data'];
    server?: T['data'];
    mobile?: T['data'];
    desktop?: T['data'];
  }
): PlatformResult<T> {
  if (process.env.SERVER) {
    return (datasource.server ?? datasource.data) as PlatformResult<T>;
  }

  if (!process.env.CLIENT) {
    return datasource.data as PlatformResult<T>;
  }

  const datasourceKeys = ['nativeMobile', 'electron', 'desktop', 'mobile'] as const;

  for (const platform of datasourceKeys) {
    if (Platform.is[platform]) {
      return (datasource[platform] ?? datasource.data) as PlatformResult<T>;
    }
  }

  return datasource.data as PlatformResult<T>;
}
