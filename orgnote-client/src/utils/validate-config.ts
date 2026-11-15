import { parseToml } from 'orgnote-api/utils';
import { safeParse, type BaseIssue } from 'valibot';
import { ORG_NOTE_CONFIG_SCHEMA, type ValidationError } from 'orgnote-api';
import { to } from 'orgnote-api/utils';

const toTextContent = (content: string | Uint8Array): string =>
  typeof content === 'string' ? content : new TextDecoder().decode(content);

const createTomlSyntaxError = (error: Error & { line?: number; column?: number }): ValidationError => ({
  message: `TOML syntax error: ${error.message}`,
  severity: 'error',
  line: error.line,
  column: error.column,
});

const createSchemaError = (path: string, message: string): ValidationError => ({
  message: path ? `${path}: ${message}` : message,
  severity: 'error',
});

const formatIssuePath = (issue: BaseIssue<unknown>): string =>
  issue.path?.map((p) => p.key).join('.') ?? '';

const mapSchemaIssuesToErrors = (issues: [BaseIssue<unknown>, ...BaseIssue<unknown>[]]): ValidationError[] =>
  issues.map((issue) => createSchemaError(formatIssuePath(issue), issue.message));

export const validateConfigToml = async (
  content: string | Uint8Array,
): Promise<ValidationError[]> => {
  const textContent = toTextContent(content);
  const safeParseToml = to(parseToml);
  const parseResult = safeParseToml(textContent);

  if (parseResult.isErr()) {
    return [createTomlSyntaxError(parseResult.error as Error & { line?: number; column?: number })];
  }

  const schemaResult = safeParse(ORG_NOTE_CONFIG_SCHEMA, parseResult.value);

  if (!schemaResult.success) {
    return mapSchemaIssuesToErrors(schemaResult.issues);
  }

  return [];
};
