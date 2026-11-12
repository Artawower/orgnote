export interface GraphNodeViewModel {
  id: string;
  label: string;
  weight: number;
  path: string;
}

export interface GraphEdgeViewModel {
  id: string;
  source: string;
  target: string;
}

export interface GraphViewModel {
  nodes: GraphNodeViewModel[];
  edges: GraphEdgeViewModel[];
}

export interface GraphBuildResult {
  graph: GraphViewModel;
  adjacency: Record<string, string[]>;
}
