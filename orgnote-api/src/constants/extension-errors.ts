export class ExtensionMissingDefaultExportError extends Error {
  constructor() {
    super('Extension must have a default export with onMounted handler');
    this.name = 'ExtensionMissingDefaultExportError';
  }
}

export class ExtensionInvalidManifestError extends Error {
  constructor() {
    super('Extension must export a manifest object');
    this.name = 'ExtensionInvalidManifestError';
  }
}

export class ExtensionParsingError extends Error {
  constructor(fileName: string, options?: ErrorOptions) {
    super(`Failed to parse extension "${fileName}"`, options);
    this.name = 'ExtensionParsingError';
  }
}
