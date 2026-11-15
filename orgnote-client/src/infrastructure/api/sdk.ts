import type { AxiosInstance } from 'axios';
import { AuthApiFactory, SyncApiFactory, SystemInfoApiFactory } from 'orgnote-api/remote-api';

export interface Sdk {
  auth: ReturnType<typeof AuthApiFactory>;
  sync: ReturnType<typeof SyncApiFactory>;
  systemInfo: ReturnType<typeof SystemInfoApiFactory>;
}

export const createSdk = (axiosInstance: AxiosInstance): Sdk => ({
  auth: AuthApiFactory(undefined, '', axiosInstance),
  sync: SyncApiFactory(undefined, '', axiosInstance),
  systemInfo: SystemInfoApiFactory(undefined, '', axiosInstance),
});
