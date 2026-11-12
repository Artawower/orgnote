import type { StoryObj } from '@storybook/vue3-vite';
import StoryList from './StoryList.vue';
import { computed, ref } from 'vue';
import AppCheckbox from 'src/components/AppCheckbox.vue';

export default {
  component: AppCheckbox,
  title: 'Forms/Checkbox',
  tags: ['autodocs'],
  args: {
    modelValue: false,
    disabled: false,
  },
};

const states = [
  { id: '1', label: 'Unchecked', value: false, disabled: false },
  { id: '2', label: 'Checked', value: true, disabled: false },
  { id: '3', label: 'Disabled Unchecked', value: false, disabled: true },
  { id: '4', label: 'Disabled Checked', value: true, disabled: true },
];

export const Default: StoryObj<typeof AppCheckbox> = {
  render: (args) => ({
    components: { StoryList, AppCheckbox },
    setup() {
      const values = ref(
        states.reduce(
          (acc, state) => {
            acc[state.id] = state.value;
            return acc;
          },
          {} as Record<string, boolean>,
        ),
      );

      const listItems = computed(() => {
        return states.map((state) => ({
          component: AppCheckbox,
          props: {
            ...args,
            modelValue: values.value[state.id],
            disabled: state.disabled,
            'onUpdate:modelValue': (val: boolean) => {
              values.value[state.id] = val;
            },
          },
          description: state.label,
        }));
      });

      return {
        args,
        listItems,
      };
    },
    template: `<story-list :items="listItems" />`,
  }),
};

export const Interactive: StoryObj<typeof AppCheckbox> = {
  render: (args) => ({
    components: { AppCheckbox },
    setup() {
      const value = ref(false);
      return { args, value };
    },
    template: `
      <div style="display: flex; align-items: center; gap: 8px;">
        <app-checkbox v-model="value" v-bind="args" />
        <span style="font-family: sans-serif; font-size: 14px; color: #37352f;">
          Value: {{ value }}
        </span>
      </div>
    `,
  }),
};
