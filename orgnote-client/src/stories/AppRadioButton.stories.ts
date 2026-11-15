import type { StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';
import AppRadioButton from 'src/components/AppRadioButton.vue';
import StoryList from './StoryList.vue';

export default {
  component: AppRadioButton,
  title: 'Forms/RadioButton',
  tags: ['autodocs'],
  args: {
    modelValue: false,
    size: 'md',
    disabled: false,
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

const states = [
  { id: '1', label: 'sm / unchecked', value: false, disabled: false, size: 'sm' },
  { id: '2', label: 'sm / checked', value: true, disabled: false, size: 'sm' },
  { id: '3', label: 'md / unchecked', value: false, disabled: false, size: 'md' },
  { id: '4', label: 'md / checked', value: true, disabled: false, size: 'md' },
  { id: '5', label: 'lg / unchecked', value: false, disabled: false, size: 'lg' },
  { id: '6', label: 'lg / checked', value: true, disabled: false, size: 'lg' },
  { id: '7', label: 'md / disabled unchecked', value: false, disabled: true, size: 'md' },
  { id: '8', label: 'md / disabled checked', value: true, disabled: true, size: 'md' },
] as const;

export const Default: StoryObj<typeof AppRadioButton> = {
  render: (args) => ({
    components: { StoryList, AppRadioButton },
    setup() {
      const values = ref(
        states.reduce((acc, s) => ({ ...acc, [s.id]: s.value }), {} as Record<string, boolean>),
      );

      const listItems = computed(() =>
        states.map((s) => ({
          component: AppRadioButton,
          props: {
            ...args,
            size: s.size,
            modelValue: values.value[s.id],
            disabled: s.disabled,
            'onUpdate:modelValue': (val: boolean) => {
              values.value[s.id] = val;
            },
          },
          description: s.label,
        })),
      );

      return { args, listItems };
    },
    template: `<story-list :items="listItems" />`,
  }),
};

export const Interactive: StoryObj<typeof AppRadioButton> = {
  render: (args) => ({
    components: { AppRadioButton },
    setup() {
      const value = ref(false);
      return { args, value };
    },
    template: `
      <div style="display: flex; align-items: center; gap: 12px;">
        <app-radio-button v-model="value" v-bind="args" />
        <span style="font-family: sans-serif; font-size: 14px;">
          {{ value ? 'Checked' : 'Unchecked' }}
        </span>
      </div>
    `,
  }),
};
