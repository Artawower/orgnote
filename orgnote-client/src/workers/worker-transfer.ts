const collectFromValue = (
  value: unknown,
  transfers: Set<ArrayBuffer>,
  visited: WeakSet<object>,
): void => {
  if (value instanceof ArrayBuffer) {
    transfers.add(value);
    return;
  }
  if (ArrayBuffer.isView(value)) {
    if (value.buffer instanceof ArrayBuffer) transfers.add(value.buffer);
    return;
  }
  if (!value || typeof value !== 'object' || visited.has(value)) return;
  visited.add(value);
  Object.values(value).forEach((item) => collectFromValue(item, transfers, visited));
};

export const collectBinaryTransferables = (value: unknown): Transferable[] => {
  const transfers = new Set<ArrayBuffer>();
  collectFromValue(value, transfers, new WeakSet());
  return [...transfers];
};
