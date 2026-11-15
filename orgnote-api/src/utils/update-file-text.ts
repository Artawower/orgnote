import type { FileContent } from '../models/file-content';
import { textToUint8Array, uint8ArrayToText } from './binary';

export type TextMutation = (text: string) => string;

export const updateFileText = (
  fileContent: Pick<FileContent, 'update'>,
  path: string,
  mutate: TextMutation,
): Promise<boolean> =>
  fileContent.update(path, (content) => {
    const text = uint8ArrayToText(content);
    const nextText = mutate(text);
    return nextText === text ? undefined : textToUint8Array(nextText);
  });
