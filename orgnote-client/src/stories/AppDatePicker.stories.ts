import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppDatePicker from 'src/components/AppDatePicker.vue';
import { ref, computed } from 'vue';
import type { DateMarker, DateMarkerType, DatePickerMode } from 'src/models/date-picker';
import { parseCalendarDate } from 'src/utils/org-date';

type DatePickerView = 'Calendar' | 'Months' | 'Years';

interface AppDatePickerStoryArgs {
  mode?: DatePickerMode;
  readonly?: boolean;
  markers?: DateMarker[];
  markerType?: DateMarkerType;
  minimal?: boolean;
  disabledDates?: ((date: string) => boolean) | string[];
  minDate?: string;
  maxDate?: string;
  firstDayOfWeek?: string | number;
  todayBtn?: boolean;
  defaultView?: DatePickerView;
  emitImmediately?: boolean;
}

const meta = {
  component: AppDatePicker,
  title: 'Forms/DatePicker',
  tags: ['autodocs'],
  args: {
    mode: 'single',
    readonly: false,
    minimal: false,
    todayBtn: true,
    firstDayOfWeek: 1,
    defaultView: 'Calendar',
    markerType: 'dot',
  },
  argTypes: {
    mode: {
      control: 'select',
      options: ['single', 'range', 'multiple'],
    },
    markerType: {
      control: 'select',
      options: ['dot', 'bar', 'highlight'],
    },
    defaultView: {
      control: 'select',
      options: ['Calendar', 'Months', 'Years'],
    },
    firstDayOfWeek: {
      control: { type: 'number', min: 0, max: 6 },
    },
  },
} as Meta<AppDatePickerStoryArgs>;

export default meta;

type Story = StoryObj<AppDatePickerStoryArgs>;

const today = new Date();
const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
};

const NOTE_COUNTS = [3, 1, 4, 1, 5, 2, 3, 2, 4, 1];

const generateMarkers = (): DateMarker[] => {
  const markers: DateMarker[] = [];
  const year = today.getFullYear();
  const month = today.getMonth();
  const colors = ['red', 'green', 'blue', 'orange', 'purple'];

  for (let i = 1; i <= 28; i += 3) {
    const date = new Date(year, month, i);
    markers.push({
      date: formatDate(date),
      color: colors[i % colors.length],
      label: `Note from day ${i}`,
      data: { noteCount: NOTE_COUNTS[((i - 1) / 3) % NOTE_COUNTS.length] },
    });
  }
  return markers;
};

export const Default: Story = {
  render: (args) => ({
    components: { AppDatePicker },
    setup() {
      const date = ref(formatDate(today));
      return { args, date };
    },
    template: `
      <div style="max-width: 320px;">
        <app-date-picker v-bind="args" v-model="date" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--fg-muted, #888);">
          Selected: {{ date }}
        </p>
      </div>
    `,
  }),
};

export const Minimal: Story = {
  args: {
    minimal: true,
  },
  render: (args) => ({
    components: { AppDatePicker },
    setup() {
      const date = ref(formatDate(today));
      return { args, date };
    },
    template: `
      <div style="max-width: 290px;">
        <app-date-picker v-bind="args" v-model="date" />
      </div>
    `,
  }),
};

export const WithMarkers: Story = {
  render: (args) => ({
    components: { AppDatePicker },
    setup() {
      const date = ref(formatDate(today));
      const markers = ref(generateMarkers());
      const lastClick = ref('');

      const onDateClick = (payload: { date: string; markers: DateMarker[] }) => {
        lastClick.value = payload.markers.length
          ? `${payload.date} (${payload.markers.length} notes)`
          : payload.date;
      };

      return { args, date, markers, lastClick, onDateClick };
    },
    template: `
      <div style="max-width: 320px;">
        <app-date-picker 
          v-bind="args" 
          v-model="date" 
          :markers="markers"
          @date-click="onDateClick"
        />
        <p style="margin-top: 12px; font-size: 13px; color: var(--fg-muted, #888);">
          Last click: {{ lastClick || 'none' }}
        </p>
      </div>
    `,
  }),
};

export const RangeSelection: Story = {
  args: {
    mode: 'range',
  },
  render: (args) => ({
    components: { AppDatePicker },
    setup() {
      const range = ref<{ from: string; to: string } | undefined>(undefined);
      const rangeDisplay = computed(() => {
        if (!range.value) return 'none';
        return `${range.value.from} → ${range.value.to}`;
      });
      return { args, range, rangeDisplay };
    },
    template: `
      <div style="max-width: 320px;">
        <app-date-picker v-bind="args" v-model="range" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--fg-muted, #888);">
          Range: {{ rangeDisplay }}
        </p>
      </div>
    `,
  }),
};

export const MultipleSelection: Story = {
  args: {
    mode: 'multiple',
  },
  render: (args) => ({
    components: { AppDatePicker },
    setup() {
      const dates = ref<string[]>([]);
      return { args, dates };
    },
    template: `
      <div style="max-width: 320px;">
        <app-date-picker v-bind="args" v-model="dates" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--fg-muted, #888);">
          Selected ({{ dates.length }}): {{ dates.join(', ') || 'none' }}
        </p>
      </div>
    `,
  }),
};

export const ReadonlyWithMarkers: Story = {
  args: {
    readonly: true,
    minimal: true,
  },
  render: (args) => ({
    components: { AppDatePicker },
    setup() {
      const date = ref(formatDate(today));
      const markers = ref(generateMarkers());
      return { args, date, markers };
    },
    template: `
      <div style="max-width: 290px;">
        <p style="margin-bottom: 8px; font-size: 13px; color: var(--fg-muted, #888);">
          Sidebar mini-calendar (readonly, navigation enabled)
        </p>
        <app-date-picker 
          v-bind="args" 
          v-model="date" 
          :markers="markers"
        />
      </div>
    `,
  }),
};

export const WithDisabledDates: Story = {
  render: (args) => ({
    components: { AppDatePicker },
    setup() {
      const date = ref(formatDate(today));
      const isWeekend = (dateStr: string) => {
        const date = parseCalendarDate(dateStr);
        if (!date) return false;
        const day = date.getDay();
        return day === 0 || day === 6;
      };
      return { args, date, isWeekend };
    },
    template: `
      <div style="max-width: 320px;">
        <p style="margin-bottom: 8px; font-size: 13px; color: var(--fg-muted, #888);">
          Weekends disabled
        </p>
        <app-date-picker 
          v-bind="args" 
          v-model="date" 
          :disabled-dates="isWeekend"
        />
      </div>
    `,
  }),
};

export const NavigationBounds: Story = {
  render: (args) => ({
    components: { AppDatePicker },
    setup() {
      const date = ref(formatDate(today));
      const year = today.getFullYear();
      const minDate = `${year}/01`;
      const maxDate = `${year}/12`;
      return { args, date, minDate, maxDate };
    },
    template: `
      <div style="max-width: 320px;">
        <p style="margin-bottom: 8px; font-size: 13px; color: var(--fg-muted, #888);">
          Navigation limited to current year
        </p>
        <app-date-picker 
          v-bind="args" 
          v-model="date" 
          :min-date="minDate" 
          :max-date="maxDate"
        />
      </div>
    `,
  }),
};
