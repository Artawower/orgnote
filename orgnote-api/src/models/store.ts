import type { defineStore } from 'pinia';

export type StoreDefinition<T> = ReturnType<typeof defineStore<string, T>>;
