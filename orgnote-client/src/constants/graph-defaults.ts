import type { GraphUiConfig } from 'orgnote-api';

export const DEFAULT_GRAPH_CONFIG: GraphUiConfig = {
  nodeRelSize: 9,
  linkDistance: 85,
  chargeStrength: -95,
  warmupTicks: 320,
  velocityDecay: 0.4,
  initialZoom: 1.15,
  labelFontSize: 10,
  linkWidth: 0.35,
};
