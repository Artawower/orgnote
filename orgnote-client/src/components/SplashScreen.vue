<template>
  <app-flex class="splash-screen" row center align-center>
    <app-flex class="content" column center align-center gap="md">
      <div class="image-container">
        <img alt="orgnote icon" src="/icons/modern-unicorn-round.png" />
        <div class="gloss"></div>
      </div>
      <h5 class="title color-white">
        {{ displayMessage }}
      </h5>
      <linear-progress />
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import LinearProgress from 'src/components/LinearProgress.vue';
import { useLoadingMessages } from 'src/composables/use-loading-messages';
import AppFlex from 'src/components/AppFlex.vue';
import { computed } from 'vue';

const props = defineProps<{
  message?: string;
}>();

const loadingMessages = useLoadingMessages();

const displayMessage = computed(() => props.message ?? loadingMessages.currentMessage.value);
</script>

<style lang="scss" scoped>
h5 {
  padding-bottom: var(--padding-lg);
}
.splash-screen {
  @include fit();
  @include overscreen;

  & {
    color: white;
    background-color: var(--violet);
    padding: var(--padding-xl);
  }

  .content {
    & {
      margin-top: 98px;
    }
  }
}

.image-container {
  position: relative;
  display: inline-block;
  overflow: hidden;
  width: 40%;
  height: 40%;
  border-radius: 50%;
}

.image-container img {
  display: inline-block;
  width: 100%;
  height: auto;
}

.gloss {
  position: absolute;
  top: -150%;
  left: -100%;
  width: 200%;
  height: 200%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 70%);
  transform: rotate(-30deg);
  animation: gloss-animation 2s infinite;
}

@keyframes gloss-animation {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(-30deg);
  }
  50% {
    transform: translateX(25%) translateY(25%) rotate(-30deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(-30deg);
  }
}

.q-linear-progress {
  width: 40%;
}

.title {
  text-align: center;
}
</style>
