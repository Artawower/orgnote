import type { StoryObj } from '@storybook/vue3-vite';
import AppCard from 'src/components/AppCard.vue';
import InputField from 'src/components/InputField.vue';

export default {
  component: InputField,
  title: 'InputField',
  tags: ['autodocs'],
  args: {},
};

export const Default: StoryObj<typeof InputField> = {
  args: {
    modelValue: 'test',
    placeholder: 'placeholder',
    name: 'any-name',
    type: 'text',
  },
  render: (args) => ({
    components: { InputField },
    setup() {
      return { args };
    },
    template: '<input-field v-bind="args" />',
  }),
};

export const PasswordWithToggle: StoryObj<typeof InputField> = {
  args: {
    modelValue: 'my-secret-passphrase',
    placeholder: 'passphrase',
    name: 'passphrase',
    type: 'password',
    passwordToggle: true,
  },
  render: (args) => ({
    components: { InputField },
    setup() {
      return { args };
    },
    template: '<input-field v-bind="args" />',
  }),
};

export const InsideCard: StoryObj<typeof InputField> = {
  args: {
    modelValue: 'qweqwebebe1',
    placeholder: 'Private Key Passphrase',
    name: 'private-key-passphrase',
    type: 'password',
    passwordToggle: true,
    textRight: true,
  },
  render: (args) => ({
    components: { InputField, AppCard },
    setup() {
      return { args };
    },
    template: '<app-card type="info"><input-field v-bind="args" /></app-card>',
  }),
};
