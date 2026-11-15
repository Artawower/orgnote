import { getCssVar } from 'src/utils/css-utils';

export interface GraphColorsComposable {
  nodeColorFor: (isActive: boolean, hasHighlight: boolean) => string;
  edgeColorFor: (isHighlighted: boolean, hasHighlight: boolean) => string;
}

export const useGraphColors = (): GraphColorsComposable => {
  const nodeColorFor = (isActive: boolean, hasHighlight: boolean): string => {
    if (isActive) return getCssVar('--graph-active-color') ?? '';
    if (hasHighlight) return getCssVar('--graph-node-dim-color') ?? '';
    return getCssVar('--graph-node-color') ?? '';
  };

  const edgeColorFor = (isHighlighted: boolean, hasHighlight: boolean): string => {
    if (isHighlighted) return getCssVar('--graph-edge-highlight-color') ?? '';
    if (hasHighlight) return getCssVar('--graph-edge-dim-color') ?? '';
    return getCssVar('--graph-edge-color') ?? '';
  };

  return { nodeColorFor, edgeColorFor };
};
