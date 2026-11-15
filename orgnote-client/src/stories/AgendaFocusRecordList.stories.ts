import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AgendaFocusRecordList from 'src/extensions/org-agenda/components/AgendaFocusRecordList.vue';
import type {
  AgendaFocusRecordGroup,
  AgendaFocusRecordListProps,
} from 'src/extensions/org-agenda/components/agenda-focus-record-types';

const groups: readonly AgendaFocusRecordGroup[] = [
  {
    filePath: '/notes/project.org',
    fileTitle: 'Project',
    records: [
      {
        startTime: Date.UTC(2026, 6, 29, 8),
        taskText: 'Design focus statistics',
        timeRange: 'Today · 08:00–08:50',
        duration: '50 min',
        taskStart: 120,
      },
      {
        startTime: Date.UTC(2026, 6, 29, 14),
        taskText: 'Implement chart interactions',
        timeRange: 'Today · 14:00–14:35',
        duration: '35 min',
        taskStart: 240,
      },
    ],
  },
  {
    filePath: '/notes/learning.org',
    fileTitle: 'Learning',
    records: [
      {
        startTime: Date.UTC(2026, 6, 28, 18),
        taskText: 'Read ECharts documentation',
        timeRange: 'Yesterday · 18:00–18:45',
        duration: '45 min',
        taskStart: 80,
      },
    ],
  },
];

const meta: Meta<AgendaFocusRecordListProps> = {
  component: AgendaFocusRecordList,
  title: 'Agenda/AgendaFocusRecordList',
  tags: ['autodocs'],
  args: {
    groups,
  },
  render: (args) => ({
    components: { AgendaFocusRecordList },
    setup: () => ({ args }),
    template: `
      <div style="width: 100%; max-width: 720px; padding: var(--padding-lg); box-sizing: border-box;">
        <agenda-focus-record-list v-bind="args" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AgendaFocusRecordListProps>;

export const Normal: Story = {};

export const RepeatedIntervals: Story = {
  args: {
    groups: [
      {
        filePath: '/notes/project.org',
        fileTitle: 'Project',
        records: [
          {
            startTime: Date.UTC(2026, 6, 29, 9),
            taskText: 'Write project notes',
            timeRange: 'Today · 09:00–09:25',
            duration: '25 min',
            taskStart: 120,
          },
          {
            startTime: Date.UTC(2026, 6, 29, 11),
            taskText: 'Write project notes',
            timeRange: 'Today · 11:00–11:25',
            duration: '25 min',
            taskStart: 120,
          },
        ],
      },
    ],
  },
};

export const Empty: Story = {
  args: { groups: [] },
};
