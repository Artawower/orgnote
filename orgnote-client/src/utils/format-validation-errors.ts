export interface ValiIssuePathItem {
  type: string;
  origin: string;
  input: unknown;
  key?: string;
}

export interface ValiIssue {
  kind: string;
  type: string;
  expected: string;
  received: string;
  message: string;
  path?: ValiIssuePathItem[];
  issues?: ValiIssue[];
}

export interface ValiError extends Error {
  issues: ValiIssue[];
  name: string;
}

const unknownErrorMessage = 'Unknown error. Please try again later.';
const defaultValidationErrorMessage = 'Validation error';
const unknownFieldName = 'Unknown field';

function createIssueMessage(issue: ValiIssue): string {
  const pathItem = issue.path?.[issue.path.length - 1];
  const fieldName = pathItem?.key ?? unknownFieldName;
  const baseMessage = `Invalid type, expected ${issue.expected} but got ${issue.received}.`;
  let result = `${fieldName}: ${baseMessage}`;

  if (issue.issues && issue.issues.length > 0) {
    const possibleValues = issue.issues.map((subIssue) => subIssue.message).join(', ');
    result += ` Allowed values: ${possibleValues}.`;
  }

  return result;
}

export function formatValidationErrors(error: unknown): string[] {
  if (!error || typeof error !== 'object') {
    return [unknownErrorMessage];
  }

  const valiError = error as Partial<ValiError>;
  if (!valiError.issues) {
    return [valiError.message ?? defaultValidationErrorMessage];
  }

  return valiError.issues.map(createIssueMessage);
}
