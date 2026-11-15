import {
  type ExtensionManifest,
  type Extension,
  ExtensionMissingDefaultExportError,
  ExtensionInvalidManifestError,
} from 'orgnote-api';
import { validateManifest } from './validate-manifest';
import { textToUint8Array, to, uint8ArrayToBase64 } from 'orgnote-api/utils';

export interface CompiledExtension {
  module: Extension;
  manifest: ExtensionManifest;
  rawContent: string;
}

interface ImportedModule {
  default?: Extension;
  manifest?: ExtensionManifest;
}

const importModuleSource = async (source: string): Promise<ImportedModule> => {
  const encodedSource = uint8ArrayToBase64(textToUint8Array(source));
  const moduleUrl = `data:text/javascript;base64,${encodedSource}`;
  return (await import(/* @vite-ignore */ moduleUrl)) as ImportedModule;
};

const importModule = to(importModuleSource, 'Module import failed');

const validateModuleStructure = (module: ImportedModule): void => {
  if (!module.default) throw new ExtensionMissingDefaultExportError();
  if (!module.manifest) throw new ExtensionInvalidManifestError();
};

export async function parseExtensionFromFile(file: File): Promise<CompiledExtension> {
  return parseExtension(await file.text());
}

export async function parseExtension(rawContent: string): Promise<CompiledExtension> {
  const moduleResult = await importModule(rawContent);
  if (moduleResult.isErr()) throw moduleResult.error;

  const module = moduleResult.value;
  validateModuleStructure(module);
  validateManifest(module.manifest!);

  return {
    module: module.default!,
    manifest: module.manifest!,
    rawContent,
  };
}

export async function compileExtension(source: string): Promise<Extension> {
  const module = await importModuleSource(source);
  if (!module.default) throw new ExtensionMissingDefaultExportError();
  return module.default;
}
