import type { OrgNoteApi } from 'orgnote-api';

declare global {
  interface Window {
    orgnote?: OrgNoteApi;
  }
}

export {};
