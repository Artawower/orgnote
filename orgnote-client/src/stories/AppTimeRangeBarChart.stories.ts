import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppTimeRangeBarChart from 'src/components/charts/AppTimeRangeBarChart.vue';
import type {
  AppTimeRangeBarChartProps,
  TimeRangeBarEntry,
  TimeRangeBarLabels,
} from 'src/components/charts/time-range-bar-types';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_START = new Date(2025, 0, 1).getTime();
const range = { startTime: DAY_START, endTime: DAY_START + 24 * HOUR_MS };

const labels: TimeRangeBarLabels = {
  ariaLabel: 'Focus intervals during the selected day',
  formatDuration: (duration) => `${Math.round(duration / MINUTE_MS)} min`,
};

const entry = (
  label: string,
  startHour: number,
  durationMinutes: number,
): TimeRangeBarEntry => ({
  label,
  startTime: DAY_START + startHour * HOUR_MS,
  endTime: DAY_START + startHour * HOUR_MS + durationMinutes * MINUTE_MS,
});

const meta: Meta<AppTimeRangeBarChartProps> = {
  component: AppTimeRangeBarChart,
  title: 'Charts/AppTimeRangeBarChart',
  tags: ['autodocs'],
  args: {
    entries: [
      entry('Plan the day', 8, 25),
      entry('Write project notes', 10, 50),
      entry('Review open tasks', 14, 35),
      entry('Read documentation', 18, 45),
    ],
    labels,
    locale: 'en-US',
    range,
  },
  render: (args) => ({
    components: { AppTimeRangeBarChart },
    setup: () => ({ args }),
    template: `
      <div style="width: 100%; max-width: 960px; padding: 24px; box-sizing: border-box;">
        <app-time-range-bar-chart v-bind="args" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AppTimeRangeBarChartProps>;

export const Normal: Story = {};

export const Empty: Story = {
  args: { entries: [] },
};

export const Overlapping: Story = {
  args: {
    entries: [
      entry('Research chart libraries', 9, 120),
      entry('Organize research notes', 9.5, 60),
      entry('Review implementation', 10, 90),
    ],
  },
};

export const LongDay: Story = {
  args: {
    entries: [
      entry('Morning planning', 1, 25),
      entry('Deep work', 6, 180),
      entry('Implementation', 13, 240),
      entry('Daily review', 22, 50),
    ],
  },
};
