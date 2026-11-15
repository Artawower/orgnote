import type { DiskFile } from 'orgnote-api';
import { isPresent } from 'orgnote-api/utils';

const BROKEN_CONFIG_PATTERN = /^config-broken-(\d+)\.toml$/;

const extractBrokenConfigIndex = (name: string): number | null => {
  const match = BROKEN_CONFIG_PATTERN.exec(name);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 1 ? value : null;
};

export const getNextBrokenConfigIndex = (files: ReadonlyArray<DiskFile>): number => {
  const maxIndex = files
    .map((f) => extractBrokenConfigIndex(f.name))
    .filter((v): v is number => isPresent(v))
    .reduce((acc, v) => Math.max(acc, v), 0);

  return maxIndex + 1;
};

