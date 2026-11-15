import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { addDays, format } from 'date-fns';
import { ref } from 'vue';
import AppCalendarHeatmapChart from 'src/components/charts/AppCalendarHeatmapChart.vue';
import type {
  AppCalendarHeatmapChartProps,
  CalendarHeatmapEntry,
  CalendarHeatmapLabels,
} from 'src/components/charts/calendar-heatmap-types';

const STORY_YEAR = 2025;

const labels: CalendarHeatmapLabels = {
  ariaLabel: 'Focus time by day in 2025',
  less: 'Less',
  more: 'More',
  formatValue: (value) => `${Math.round(value)} min`,
};

const createEntries = (): CalendarHeatmapEntry[] =>
  Array.from({ length: 365 }, (_, index) => ({
    date: format(addDays(new Date(STORY_YEAR, 0, 1), index), 'yyyy-MM-dd'),
    value: index % 9 === 0 ? ((index * 17) % 180) + 10 : 0,
  })).filter(({ value }) => value > 0);

const meta: Meta<AppCalendarHeatmapChartProps> = {
  component: AppCalendarHeatmapChart,
  title: 'Charts/AppCalendarHeatmapChart',
  tags: ['autodocs'],
  args: {
    entries: createEntries(),
    labels,
    locale: 'en-US',
    month: 6,
    selectedDate: '2025-06-14',
    view: 'year',
    year: STORY_YEAR,
  },
  render: (args) => ({
    components: { AppCalendarHeatmapChart },
    setup() {
      const selectedDate = ref(args.selectedDate);
      return { args, selectedDate };
    },
    template: `
      <div style="width: 100%; max-width: 960px; padding: 24px; box-sizing: border-box;">
        <app-calendar-heatmap-chart
          v-bind="args"
          :selected-date="selectedDate"
          @select-date="selectedDate = $event"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AppCalendarHeatmapChartProps>;

export const Year: Story = {};

export const Month: Story = {
  args: { view: 'month' },
  render: (args) => ({
    components: { AppCalendarHeatmapChart },
    setup() {
      const selectedDate = ref(args.selectedDate);
      return { args, selectedDate };
    },
    template: `
      <div style="width: 390px; padding: 16px; box-sizing: border-box;">
        <app-calendar-heatmap-chart
          v-bind="args"
          :selected-date="selectedDate"
          @select-date="selectedDate = $event"
        />
      </div>
    `,
  }),
};

export const Empty: Story = {
  args: { entries: [], selectedDate: '2025-01-01' },
};

export const Dense: Story = {
  args: {
    entries: Array.from({ length: 365 }, (_, index) => ({
      date: format(addDays(new Date(STORY_YEAR, 0, 1), index), 'yyyy-MM-dd'),
      value: (index % 120) + 1,
    })),
  },
};
