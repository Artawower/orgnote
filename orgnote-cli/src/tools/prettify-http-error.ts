import { AxiosError } from 'axios';

export function prettifyHttpError(e: unknown): string | any {
  if (e instanceof AxiosError) {
    const data = e.response?.data ?? (e as any).body;

    return `
    | status: ${e.status ?? ''}
    | data: ${data ? JSON.stringify(data) : ''}
    | message: ${e.message ?? ''}
`;
  }

  return e;
}
