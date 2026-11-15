const readLineAt = (content: string, start: number): string => {
  const lineEnd = content.indexOf('\n', start);
  return content.slice(start, lineEnd < 0 ? undefined : lineEnd);
};

export const isTaskLineAt = (content: string, start: number | undefined, title: string): boolean => {
  if (start === undefined) return false;
  const isLineStart = start === 0 || content[start - 1] === '\n';
  return isLineStart && readLineAt(content, start).includes(title);
};
