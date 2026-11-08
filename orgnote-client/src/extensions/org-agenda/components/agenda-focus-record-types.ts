export interface AgendaFocusRecordItem {
  readonly startTime: number;
  readonly taskText: string;
  readonly timeRange: string;
  readonly duration: string;
  readonly taskStart: number;
}

export interface AgendaFocusRecordGroup {
  readonly filePath: string;
  readonly fileTitle: string;
  readonly records: readonly AgendaFocusRecordItem[];
}

export interface AgendaFocusRecordListProps {
  readonly groups: readonly AgendaFocusRecordGroup[];
}
