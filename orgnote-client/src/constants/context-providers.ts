import type { InjectionKey, ShallowRef } from 'vue';
import type { Router } from 'vue-router';

export const TAB_ROUTER_KEY: InjectionKey<ShallowRef<Router | undefined>> = Symbol('tabRouter');
