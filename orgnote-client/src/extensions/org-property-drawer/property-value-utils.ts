export const PROPERTY_VALUE_PREVIEW_LIMIT = 42;
const PROPERTY_VALUE_PREVIEW_TEXT_LIMIT = PROPERTY_VALUE_PREVIEW_LIMIT - 1;

export const truncateValue = (value: string): string =>
  value.length > PROPERTY_VALUE_PREVIEW_LIMIT
    ? `${value.slice(0, PROPERTY_VALUE_PREVIEW_TEXT_LIMIT)}…`
    : value;
