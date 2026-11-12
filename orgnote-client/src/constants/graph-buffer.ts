import { buildBufferUri } from 'orgnote-api';

export const GRAPH_BUFFER_PATTERN = '^/graph\\.org$';
export const GRAPH_BUFFER_URI = buildBufferUri('builtin', '/graph.org');
