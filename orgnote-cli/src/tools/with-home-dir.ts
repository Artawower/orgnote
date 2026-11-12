import { join } from 'path';

export function resolveHome(filepath: string): string {
  if (filepath[0] === '~') {
    return join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}
