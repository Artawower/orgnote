import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { BabelStore, OrgBabel } from 'orgnote-api';

export const useOrgBabelStore = defineStore<'org-babel', BabelStore>('org-babel', () => {
  const orgBabels = ref<Record<string, OrgBabel>>({});

  const execute = async (lang: string, code: string): Promise<string> => {
    const babel = orgBabels.value[lang];
    if (!babel) {
      throw new Error(`No babel registered for ${lang}`);
    }
    return babel.executor(code);
  };

  const register = (babel: OrgBabel) => {
    if (!babel.languages) return;

    babel.languages.forEach((lang) => {
      orgBabels.value = { ...orgBabels.value, [lang]: babel };
    });
  };

  const unregister = (languages: string[]) => {
    orgBabels.value = Object.fromEntries(
      Object.entries(orgBabels.value).filter(([lang]) => !languages.includes(lang)),
    );
  };

  return {
    orgBabels,
    register,
    unregister,
    execute,
  };
});
