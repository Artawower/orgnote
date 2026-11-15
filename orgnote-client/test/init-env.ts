const createStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

try {
  if (
    typeof globalThis.localStorage === 'undefined' ||
    typeof globalThis.localStorage.getItem !== 'function'
  ) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorage(),
      writable: true,
    });
  }
} catch (e) {
  console.warn('Failed to patch localStorage:', e);
}

try {
  if (
    typeof globalThis.sessionStorage === 'undefined' ||
    typeof globalThis.sessionStorage.getItem !== 'function'
  ) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createStorage(),
      writable: true,
    });
  }
} catch (e) {
  console.warn('Failed to patch sessionStorage:', e);
}
