import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppGraph from 'src/components/graph/AppGraph.vue';
import type { AppGraphProps } from 'src/components/graph/AppGraph.vue';
import type { GraphViewModel } from 'src/models/graph';

const createLegacyStyleGraph = (): GraphViewModel => ({
  nodes: [
    { id: 'pkm', label: 'Personal Knowledge', weight: 4, path: '/notes/pkm.org' },
    { id: 'zettel', label: 'Zettelkasten', weight: 3, path: '/notes/zettel.org' },
    { id: 'evergreen', label: 'Evergreen Notes', weight: 3, path: '/notes/evergreen.org' },
    { id: 'atomic', label: 'Atomic Notes', weight: 2, path: '/notes/atomic.org' },
    { id: 'linking', label: 'Note Linking', weight: 2, path: '/notes/linking.org' },
    { id: 'spaced', label: 'Spaced Repetition', weight: 2, path: '/notes/spaced.org' },
    { id: 'writing', label: 'Writing Process', weight: 3, path: '/notes/writing.org' },
    { id: 'draft', label: 'First Drafts', weight: 1, path: '/notes/draft.org' },
    { id: 'outline', label: 'Outlining', weight: 1, path: '/notes/outline.org' },
    { id: 'research', label: 'Research Methods', weight: 3, path: '/notes/research.org' },
    { id: 'sources', label: 'Source Material', weight: 2, path: '/notes/sources.org' },
    { id: 'literature', label: 'Literature Notes', weight: 2, path: '/notes/literature.org' },
    { id: 'fleeting', label: 'Fleeting Notes', weight: 1, path: '/notes/fleeting.org' },
    { id: 'projects', label: 'Active Projects', weight: 2, path: '/notes/projects.org' },
    { id: 'tasks', label: 'Task Management', weight: 2, path: '/notes/tasks.org' },
    { id: 'weekly', label: 'Weekly Review', weight: 1, path: '/notes/weekly.org' },
    { id: 'habits', label: 'Habits', weight: 1, path: '/notes/habits.org' },
    { id: 'reading', label: 'Reading List', weight: 2, path: '/notes/reading.org' },
    { id: 'quotes', label: 'Quotes', weight: 1, path: '/notes/quotes.org' },
    { id: 'ideas', label: 'Ideas Inbox', weight: 2, path: '/notes/ideas.org' },
    { id: 'mental', label: 'Mental Models', weight: 2, path: '/notes/mental.org' },
    { id: 'creativity', label: 'Creativity', weight: 1, path: '/notes/creativity.org' },
    { id: 'focus', label: 'Deep Focus', weight: 1, path: '/notes/focus.org' },
    { id: 'tools', label: 'Tools for Thought', weight: 2, path: '/notes/tools.org' },
    { id: 'orgmode', label: 'Org Mode', weight: 2, path: '/notes/orgmode.org' },
  ],
  edges: (
    [
      ['pkm', 'zettel'],
      ['pkm', 'evergreen'],
      ['pkm', 'tools'],
      ['zettel', 'atomic'],
      ['zettel', 'linking'],
      ['zettel', 'literature'],
      ['zettel', 'fleeting'],
      ['evergreen', 'atomic'],
      ['evergreen', 'linking'],
      ['writing', 'draft'],
      ['writing', 'outline'],
      ['writing', 'evergreen'],
      ['research', 'sources'],
      ['research', 'literature'],
      ['sources', 'reading'],
      ['sources', 'quotes'],
      ['literature', 'fleeting'],
      ['projects', 'tasks'],
      ['projects', 'weekly'],
      ['tasks', 'habits'],
      ['ideas', 'creativity'],
      ['ideas', 'fleeting'],
      ['mental', 'ideas'],
      ['mental', 'research'],
      ['spaced', 'evergreen'],
      ['tools', 'orgmode'],
      ['focus', 'habits'],
      ['reading', 'literature'],
    ] as Array<readonly [string, string]>
  ).map(([source, target]) => ({
    id: `${source}::${target}`,
    source,
    target,
  })),
});

const createDenseGraph = (): GraphViewModel => ({
  nodes: Array.from({ length: 8 }, (_, index) => ({
    id: `node-${index + 1}`,
    label: `Node ${index + 1}`,
    weight: 1 + ((index + 2) % 4),
    path: `/notes/node-${index + 1}.org`,
  })),
  edges: (
    [
      ['node-1', 'node-2'],
      ['node-1', 'node-3'],
      ['node-1', 'node-4'],
      ['node-2', 'node-5'],
      ['node-2', 'node-6'],
      ['node-3', 'node-7'],
      ['node-4', 'node-8'],
      ['node-5', 'node-6'],
      ['node-7', 'node-8'],
    ] as Array<readonly [string, string]>
  ).map(([source, target]) => ({
    id: `${source}::${target}`,
    source,
    target,
  })),
});

const cloneGraph = (graph: GraphViewModel): GraphViewModel => ({
  nodes: graph.nodes.map((node) => ({ ...node })),
  edges: graph.edges.map((edge) => ({ ...edge })),
});

const meta: Meta<AppGraphProps> = {
  component: AppGraph,
  title: 'Graph/AppGraph',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    graph: createLegacyStyleGraph(),
  },
  render: (args) => ({
    components: { AppGraph },
    setup() {
      return {
        args,
        storyGraph: cloneGraph(args.graph),
      };
    },
    template:
      '<div style="width: 100vw; height: 100vh; padding: 24px; box-sizing: border-box;"><app-graph v-bind="args" :graph="storyGraph" /></div>',
  }),
};

export default meta;

type Story = StoryObj<AppGraphProps>;

export const Default: Story = {};

export const LegacyLayout: Story = {
  args: {
    graph: createLegacyStyleGraph(),
  },
};

export const SelectedNeighborhood: Story = {
  args: {
    selectedNodeId: 'alpha',
    highlightedNodeIds: ['alpha', 'beta', 'gamma'],
  },
};

export const Dense: Story = {
  args: {
    graph: createDenseGraph(),
    highlightedNodeIds: ['node-1', 'node-2', 'node-3', 'node-4'],
  },
};

export const Empty: Story = {
  args: {
    graph: { nodes: [], edges: [] },
  },
};


