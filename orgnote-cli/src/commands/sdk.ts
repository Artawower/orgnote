import { OrgNotePublishedConfig } from 'config.js';
import {
  SyncApiFactory,
  type HandlersHttpResponseFileUploadResponseAny,
} from 'orgnote-api/remote-api';
import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { getLogger } from '../logger.js';
import FormData from 'form-data';

type SyncApi = ReturnType<typeof SyncApiFactory> & {
  uploadFile: (
    filePath: string,
    formData: FormData,
    contentHash?: string,
    expectedVersion?: number
  ) => Promise<AxiosResponse<HandlersHttpResponseFileUploadResponseAny>>;
  downloadFile: (path: string) => Promise<AxiosResponse<Buffer>>;
  deleteFile: (path: string, version?: number) => Promise<AxiosResponse<void>>;
};

export type Api = {
  sync: SyncApi;
};

let api: Api | null = null;
let currentConfig: OrgNotePublishedConfig | null = null;

const logger = getLogger();

const logResponseError = (error: AxiosError): void => {
  logger.error(
    'Status: %s %s',
    error.response?.status,
    error.response?.statusText
  );
  const data = error.response?.data;
  if (!data) return;
  const message =
    typeof data === 'object' && 'message' in data ? data.message : data;
  logger.error('Response: %o', message);
};

const logNoResponseError = (error: AxiosError): void => {
  logger.error('No response received. Possible causes:');
  logger.error('  - Server is not running');
  logger.error('  - Network connectivity issue');
  logger.error('  - Request timeout');
  logger.error('Error code: %s', error.code);
  logger.error('Error message: %s', error.message);
};

const logAxiosError = (error: AxiosError): void => {
  const method = error.config?.method?.toUpperCase();
  const url = error.config?.url;
  logger.error('Request failed: %s %s', method, url);

  if (error.response) return logResponseError(error);
  if (error.request) return logNoResponseError(error);
  logger.error('Request setup error: %s', error.message);
};

const handleResponseError = (error: unknown): Promise<never> => {
  if (axios.isAxiosError(error)) {
    logAxiosError(error);
  } else {
    logger.error('Unexpected error: %o', error);
  }
  return Promise.reject(error);
};

function initApi(c: OrgNotePublishedConfig): void {
  const axiosInstance = axios.create({
    baseURL: c.remoteAddress,
    timeout: +process.env.REQUEST_TIMEOUT || 15000,
    headers: {
      Authorization: `Bearer ${c.token}`,
    },
  });

  axiosInstance.interceptors.request.use((config) => {
    logger.debug(
      'Request: %s %s',
      config.method?.toUpperCase(),
      config.baseURL + config.url
    );
    const headers =
      config.headers &&
      typeof config.headers === 'object' &&
      'toJSON' in config.headers
        ? config.headers.toJSON()
        : config.headers;
    logger.debug('Headers: %o', headers);
    return config;
  });

  axiosInstance.interceptors.response.use((response) => {
    logger.debug('Response: %s %s', response.status, response.statusText);
    return response;
  }, handleResponseError);

  logger.info('API initialized: %s', c.remoteAddress);

  const baseSync = SyncApiFactory(null, '', axiosInstance);

  const uploadFile = async (
    _filePath: string,
    formData: FormData,
    contentHash?: string,
    expectedVersion?: number
  ): Promise<AxiosResponse<HandlersHttpResponseFileUploadResponseAny>> => {
    if (expectedVersion !== undefined) {
      formData.append('expectedVersion', String(expectedVersion));
    }

    const headers = {
      ...formData.getHeaders(),
      ...(contentHash ? { 'x-content-hash': contentHash } : {}),
    };

    return axiosInstance.put('/sync/files', formData, {
      headers,
    });
  };

  const downloadFile = async (path: string): Promise<AxiosResponse<Buffer>> => {
    return axiosInstance.get('/sync/files', {
      params: { path },
      responseType: 'arraybuffer',
    });
  };

  const deleteFile = async (
    path: string,
    version?: number
  ): Promise<AxiosResponse<void>> => {
    return axiosInstance.delete('/sync/files', {
      params: { path, version },
    });
  };

  api = {
    sync: {
      ...baseSync,
      uploadFile,
      downloadFile,
      deleteFile,
    },
  };
}

const isSameConfig = (c: OrgNotePublishedConfig): boolean =>
  currentConfig?.name === c.name &&
  currentConfig?.remoteAddress === c.remoteAddress;

export function getApi(c: OrgNotePublishedConfig): Api {
  if (api && isSameConfig(c)) {
    return api;
  }

  initApi(c);
  currentConfig = c;
  return api!;
}
