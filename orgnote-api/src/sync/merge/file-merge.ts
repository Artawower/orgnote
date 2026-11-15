import type { MergeInputs, MergeResult } from '../types';
import { isOrgNoteConfigPath } from '../config-path';
import { mergeText } from './text-merge';
import { mergeToml } from './toml-merge';

export const mergeFile = (
  path: string,
  inputs: MergeInputs
): MergeResult => isOrgNoteConfigPath(path) ? mergeToml(inputs) : mergeText(inputs);
