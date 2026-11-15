import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAgendaFilterStore = defineStore('agendaFilter', () => {
  const searchQuery = ref('');
  const selectedFilePath = ref<string>();

  const setFileFilter = (filePath?: string): void => {
    selectedFilePath.value = filePath;
  };

  return {
    searchQuery,
    selectedFilePath,
    setFileFilter,
  };
});
