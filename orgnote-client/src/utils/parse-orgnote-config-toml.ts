import { ORG_NOTE_CONFIG_SCHEMA, type OrgNoteConfig } from 'orgnote-api';
import { parseToml } from 'orgnote-api/utils';
import type { Result } from 'neverthrow';
import clone from 'rfdc';
import { parse } from 'valibot';
import { formatValidationErrors } from 'src/utils/format-validation-errors';
import { to } from 'orgnote-api/utils';

const cloneConfig = clone();

export class InvalidOrgNoteConfigTomlError extends Error {
  public override readonly name = 'InvalidOrgNoteConfigTomlError';

  public constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
  }
}

export class InvalidOrgNoteConfigSchemaError extends Error {
  public override readonly name = 'InvalidOrgNoteConfigSchemaError';
  public readonly errors: readonly string[];

  public constructor(errors: readonly string[], cause?: unknown) {
    super(errors.join('\n'), cause === undefined ? undefined : { cause });
    this.errors = errors;
  }
}

const createInvalidSchemaError = (cause: unknown): InvalidOrgNoteConfigSchemaError => {
  const errors = formatValidationErrors(cause);
  return new InvalidOrgNoteConfigSchemaError(errors, cause);
};

export const parseOrgNoteConfigToml = (
  rawConfigContent: string,
): Result<OrgNoteConfig, InvalidOrgNoteConfigTomlError | InvalidOrgNoteConfigSchemaError> => {
  const safeTomlParse = to(
    parseToml,
    (cause) => new InvalidOrgNoteConfigTomlError('Invalid TOML format', cause),
  );
  const safeValidate = to(parse, createInvalidSchemaError);

  return safeTomlParse(rawConfigContent)
    .andThen((obj) => safeValidate(ORG_NOTE_CONFIG_SCHEMA, obj))
    .map((validated) => cloneConfig(validated));
};
