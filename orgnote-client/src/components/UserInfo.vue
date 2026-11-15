<template>
  <card-wrapper class="user-info" padding>
    <app-flex row start align-center gap="md">
      <app-flex center>
        <app-avatar :url="user?.avatarUrl" />
      </app-flex>
      <app-flex column align-center center gap="sm">
        <app-title size="md">
          <span class="text-capitalize">{{ user?.nickName }}</span>
        </app-title>
        <div v-if="user?.email">{{ user?.email }}</div>
      </app-flex>
    </app-flex>
  </card-wrapper>
</template>

<script lang="ts" setup>
import type { PersonalInfo } from 'orgnote-api';
import AppFlex from './AppFlex.vue';
import CardWrapper from './CardWrapper.vue';
import AppAvatar from './AppAvatar.vue';
import AppTitle from './AppTitle.vue';

defineProps<{
  user?: PersonalInfo | null;
}>();
</script>

<style lang="scss" scoped>
.user-info {
  cursor: pointer;
}
</style>
