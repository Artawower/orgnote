import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import { computed } from 'vue';
import LogEntry from 'src/components/LogEntry.vue';
import type { LogRecord } from 'orgnote-api';

export default {
  component: LogEntry,
  title: 'Log Entry',
  tags: ['autodocs'],
  args: {},
};

const baseLog: LogRecord = {
  ts: new Date(),
  level: 'info',
  message: 'This is a standard log message',
};

export const Default: StoryObj<typeof LogEntry> = {
  args: {
    log: baseLog,
    position: 1,
    minimal: false,
  },
  render: (args) => ({
    components: { StoryList, LogEntry },
    setup() {
      const listItems = computed(() => {
        return [
          {
            component: LogEntry,
            props: { ...args },
            description: 'Default Info Log',
          },
          {
            component: LogEntry,
            props: {
              ...args,
              log: { ...baseLog, level: 'error', message: 'Something went wrong!' },
            },
            description: 'Error Log',
          },
          {
            component: LogEntry,
            props: {
              ...args,
              log: { ...baseLog, level: 'warn', message: 'Warning message' },
            },
            description: 'Warning Log',
          },
          {
            component: LogEntry,
            props: {
              ...args,
              minimal: true,
            },
            description: 'Minimal Mode (No Header)',
          },
          {
            component: LogEntry,
            props: {
              ...args,
              log: {
                ...baseLog,
                message: JSON.stringify({ key: 'value', nested: { id: 1 } }),
              },
            },
            description: 'JSON Message',
          },
          {
            component: LogEntry,
            props: {
              ...args,
              log: {
                ...baseLog,
                context: { stack: 'Error: Boom\n    at function (file.ts:10:5)' },
              },
            },
            description: 'With Stack Trace',
          },
          {
            component: LogEntry,
            props: {
              ...args,
              log: {
                ...baseLog,
                context: { userId: '123', action: 'login' },
              },
            },
            description: 'With Context',
          },
        ];
      });

      return {
        args,
        listItems,
      };
    },
    template: `<story-list :items="listItems" />`,
  }),
};
