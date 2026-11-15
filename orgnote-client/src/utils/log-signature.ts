import type { LogRecord } from 'orgnote-api';
import { isNullable, to } from 'orgnote-api/utils';

const SECRET_PLACEHOLDER = '***';
const EMAIL_REGEX = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;
const PHONE_REGEX = /(\+?\d[\d\s-]{7,}\d)/g;

const maskEmail = (value: string): string =>
  value.replace(EMAIL_REGEX, (_match, local, domain) => {
    if (!local) return _match;
    const visibleStart = local.slice(0, 1);
    const masked = local.length > 1 ? SECRET_PLACEHOLDER : '';
    return `${visibleStart}${masked}@${domain}`;
  });

const maskPhone = (value: string): string =>
  value.replace(PHONE_REGEX, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 8) return match;
    const maskedDigits = `${'*'.repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
    let index = 0;
    return match.replace(/\d/g, () => maskedDigits[index++] ?? '*');
  });

const sanitizeString = (value: string): string => maskPhone(maskEmail(value));

const sanitizeObject = (value: Record<string, unknown>): Record<string, unknown> => {
  const clone: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'stack' || key === 'cause') continue;
    clone[key] = sanitizeValue(entry);
  }
  return clone;
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (value && typeof value === 'object') return sanitizeObject(value as Record<string, unknown>);
  return value;
};

const normalize = (value: unknown): string => {
  if (value === undefined || isNullable(value)) return '';
  const safeStringify = to(() => JSON.stringify(value));
  const result = safeStringify();
  if (result.isOk()) return result.value;
  return String(value);
};

const createLogSignature = (record: LogRecord): string => {
  const contextKey = normalize(sanitizeObject(record.context ?? {}));
  const bindingsKey = normalize(sanitizeObject(record.bindings ?? {}));
  return `${record.level}|${record.message}|${contextKey}|${bindingsKey}`;
};

export { createLogSignature };
