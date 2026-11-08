import type { Component } from 'vue';

export type VueComponent = Component & { __name?: string };
