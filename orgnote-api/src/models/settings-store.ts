import type { Ref } from "vue";
import { OrgNoteSettings } from "./orgnote-config";
import { StoreDefinition } from "./store";
import { ModelsAPIToken } from "src/remote-api";

export interface SettingsStore {
	settings: OrgNoteSettings;
	tokens: Ref<ModelsAPIToken[]>;
	onboardingCompleted: Ref<boolean>;
	onboardingCurrentStep: Ref<number>;
	loadApiTokens: () => Promise<void>;
	createApiToken: () => Promise<void>;
	removeApiToken: (token: ModelsAPIToken) => Promise<void>;
}

export type SettingsStoreDefinition = StoreDefinition<SettingsStore>;
