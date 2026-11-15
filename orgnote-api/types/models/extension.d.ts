import { OrgNoteApi } from '../api';
export interface ExtensionManifest {
    name: string;
    version: string;
    category: 'theme' | 'extension' | 'language pack' | 'other';
    apiVersion?: string;
    author?: string;
    description?: string;
    keywords?: string[];
    sourceType: 'git' | 'file';
    readmeFilePath?: string;
    permissions?: Array<'files' | 'personal info' | '*' | 'third party'>;
    reloadRequired?: boolean;
    sourceUrl?: string;
    sponsor?: string[];
    development?: boolean;
    icon?: string;
}
export interface Extension {
    [key: string]: unknown;
    onMounted: (api: OrgNoteApi) => Promise<void>;
    onUnmounted?: (api: OrgNoteApi) => Promise<void>;
}
export interface ExtensionMeta {
    manifest: ExtensionManifest;
    uploaded?: boolean;
    active?: boolean;
}
export interface StoredExtension extends ExtensionMeta {
    module?: string;
}
export interface ActiveExtension extends ExtensionMeta {
    module: Extension;
}
