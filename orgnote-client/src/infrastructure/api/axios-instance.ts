import axios, { isAxiosError, type AxiosInstance } from 'axios';

const httpUpgradeRequired = 426;

export const createAxiosInstance = (
  getToken: () => string,
  getBaseUrl?: () => string,
  clientVersion?: string,
  onVersionIncompatible?: () => void,
): AxiosInstance => {
  const instance = axios.create({
    baseURL: process.env.API_URL || '/v1',
    timeout: 30_000,
  });

  instance.interceptors.request.use((config) => {
    const baseUrl = getBaseUrl?.();
    if (baseUrl) {
      config.baseURL = baseUrl;
    }

    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (clientVersion) {
      config.headers['X-Client-Version'] = clientVersion;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === httpUpgradeRequired) {
        onVersionIncompatible?.();
      }
      return Promise.reject(error);
    },
  );

  return instance;
};
