import { LayoutSnapshot } from './pane';

export interface StoredLayoutSnapshot {
  id: string;
  createdAt: string;
  snapshot: LayoutSnapshot;
}

export interface LayoutSnapshotRepository {
  save(snapshot: LayoutSnapshot, id?: string): Promise<void>;
  get(id: string): Promise<StoredLayoutSnapshot | undefined>;
  getLatest(): Promise<StoredLayoutSnapshot | undefined>;
  list(limit?: number): Promise<StoredLayoutSnapshot[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
