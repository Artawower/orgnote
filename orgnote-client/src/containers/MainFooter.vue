<template>
  <floating-footer v-if="!keyboardOpened">
    <app-footer :justify="tabletBelow ? 'between' : 'center'" float>
      <command-action-button size="md" v-for="cmd of toolbarCommands" :key="cmd" :command="cmd" />
    </app-footer>
  </floating-footer>
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import AppFooter from 'src/components/AppFooter.vue';
import CommandActionButton from './CommandActionButton.vue';
import { useScreenDetection } from 'src/composables/use-screen-detection';
import { useKeyboardState } from 'src/composables/use-viewport-behavior';
import FloatingFooter from 'src/components/FloatingFooter.vue';

const toolbarCommands = api.ui.usePinnedCommands().getCommands('edit-toolbar');

const { tabletBelow } = useScreenDetection();

const { keyboardOpened } = useKeyboardState();
</script>
