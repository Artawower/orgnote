declare module 'vue3-easy-data-table' {
  import type { DefineComponent } from 'vue';

  export interface Header {
    text: string;
    value: string;
    sortable?: boolean;
    fixed?: boolean;
    width?: number;
  }

  export type Item = Record<string, unknown>;

  const EasyDataTable: DefineComponent<
    {
      headers?: Header[];
      items?: Item[];
      hideFooter?: boolean;
      headerTextDirection?: 'center' | 'left' | 'right';
      bodyTextDirection?: 'center' | 'left' | 'right';
    },
    Record<string, unknown>,
    unknown
  >;

  export default EasyDataTable;
}
