<template>
  <page-wrapper centered>
    <app-flex column center gap="md">
      <app-logo />
      <action-buttons vertical>
        <command-action-button
          :command="DefaultCommands.CREATE_NOTE"
          include-text
          alignment="left"
        />
        <command-action-button :command="DefaultCommands.SEARCH" include-text alignment="left" />
        <command-action-button :command="DefaultCommands.CLOSE_TAB" include-text alignment="left" />
      </action-buttons>
    </app-flex>
  </page-wrapper>
</template>

<script lang="ts" setup>
import PageWrapper from 'src/components/PageWrapper.vue';
import ActionButtons from 'src/components/ActionButtons.vue';
import AppLogo from 'src/components/AppLogo.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import { DefaultCommands } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';
</script>

<style lang="scss" scoped>
.page {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap-lg);
}
</style>
