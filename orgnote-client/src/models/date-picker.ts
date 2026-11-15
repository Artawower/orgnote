export interface DateMarker {
  date: string;
  color?: string;
  type?: DateMarkerType;
  label?: string;
  data?: Record<string, unknown>;
}

export type DateMarkerType = 'dot' | 'bar' | 'highlight';

export type DatePickerMode = 'single' | 'range' | 'multiple';

export interface DateRange {
  from: string;
  to: string;
}

export type DatePickerSelection = string | DateRange | undefined;
export type DatePickerSelectionMode = 'single' | 'range' | 'both';
export type DatePickerSelectionForMode<TMode extends DatePickerSelectionMode> =
  TMode extends 'single'
    ? string | undefined
    : TMode extends 'range'
      ? DateRange | undefined
      : DatePickerSelection;

export interface DateNavigation {
  year: number;
  month: number;
}

export interface DateClickPayload {
  date: string;
  markers: DateMarker[];
}

export type DatePickerModelValue = string | DateRange | string[] | undefined;
