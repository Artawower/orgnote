import type { OrgNode, OrgRepeater } from 'org-mode-ast';

export type OrgWarning = OrgRepeater;

export interface OrgPlanningDate {
  readonly date: string;
  readonly hasTime: boolean;
  readonly active: boolean;
  readonly repeater?: OrgRepeater;
  readonly warning?: OrgWarning;
}

export interface OrgPlanningSetOptions {
  active?: boolean;
  withTime?: boolean;
  repeater?: OrgRepeater | null;
  warning?: OrgWarning | null;
}

export interface OrgPlanningSlot {
  readonly value: OrgPlanningDate | undefined;
  set(value: Date, options?: OrgPlanningSetOptions): void;
  clear(): void;
  advanceRepeater(from: Date): boolean;
  rewindRepeater(): boolean;
}

export interface OrgPropertyEntry {
  readonly key: string;
  readonly value: string;
}

export interface OrgProperties {
  readonly entries: Readonly<Record<string, string>>;
  readonly items: readonly OrgPropertyEntry[];
  ensure(): void;
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  rename(oldKey: string, newKey: string): void;
  remove(key: string): void;
}

export type OrgLogbookEntryType = 'state-change' | 'clock' | 'note' | 'unknown';

export interface OrgLogbookEntry {
  readonly type: OrgLogbookEntryType;
  readonly raw: string;
  readonly timestamp?: Date;
  readonly fromKeyword?: string;
  readonly toKeyword?: string;
  readonly clockStart?: Date;
  readonly clockEnd?: Date;
  readonly clockDuration?: string;
}

export interface OrgLogbook {
  readonly entries: readonly OrgLogbookEntry[];
  appendStateChange(input: { from: string; to: string; at: Date }): void;
  removeStateChange(filter: { to: string; date: string }): boolean;
  openClock(start: Date): void;
  closeClock(input: { start: Date; end: Date }): boolean;
  appendClock(input: { start: Date; end: Date }): void;
  removeClock(isoDate: string): boolean;
  clear(): void;
}

export interface OrgHeadline {
  readonly node: OrgNode;
  readonly start: number;
  readonly end: number;
  readonly level: number;
  readonly text: string;
  readonly todoKeyword: string | undefined;
  readonly priority: string | undefined;
  readonly tags: readonly string[];
  readonly body: string;
  readonly scheduled: OrgPlanningSlot;
  readonly deadline: OrgPlanningSlot;
  readonly closed: OrgPlanningSlot;
  readonly properties: OrgProperties;
  readonly logbook: OrgLogbook;
  setLevel(level: number): void;
  setTodoKeyword(keyword: string): void;
  clearTodoKeyword(): void;
  setTitle(text: string): void;
  setPriority(priority: string): void;
  clearPriority(): void;
  addTag(tag: string): void;
  removeTag(tag: string): void;
  setTags(tags: readonly string[]): void;
  setBody(body: string): void;
  remove(): void;
}

export interface OrgDocument {
  readonly root: OrgNode;
  readonly properties: OrgProperties;
  headlineAt(offset: number): OrgHeadline | undefined;
  headlines(): OrgHeadline[];
  findHeadline(
    predicate: (headline: OrgHeadline) => boolean
  ): OrgHeadline | undefined;
}
