const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailValidationMessages {
  required: string;
  invalid: string;
}

export const validateEmail = (
  value: string,
  messages: EmailValidationMessages,
): string | undefined => {
  if (!value) return messages.required;
  if (!BASIC_EMAIL_PATTERN.test(value)) return messages.invalid;
  return undefined;
};
