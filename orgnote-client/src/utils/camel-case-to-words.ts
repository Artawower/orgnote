export function camelCaseToWords(s?: string): string {
  if (!s) {
    return '';
  }
  const result = s.replace(/([A-Z])/g, ' $1').replace(/\s+/g, ' ');
  return (result.charAt(0).toUpperCase() + result.slice(1)).trim();
}
