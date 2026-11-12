import { type ExtensionManifest, EXTENSION_MANIFEST_SCHEMA } from 'orgnote-api';
import { parse } from 'valibot';
import { formatValidationErrors } from './format-validation-errors';
import { to } from 'orgnote-api/utils';

export function validateManifest(manifest: ExtensionManifest): void {
  const res = to(parse)(EXTENSION_MANIFEST_SCHEMA, manifest);
  if (res.isErr()) {
    const errorMsg = formatValidationErrors(res.error);
    throw new Error(errorMsg.join('\n'), { cause: res.error });
  }
}
