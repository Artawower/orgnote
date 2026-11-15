<template>
  <div class="log-entry" :class="log.level" @click="handleClick">
    <app-flex
      v-if="!minimal"
      class="header"
      direction="row"
      justify="start"
      align="center"
      gap="sm"
    >
      <span class="number">[{{ position }}]</span>
      <app-date :date="log.ts" format="iso" monospace />
      <app-badge :color="getLevelColor(log.level)" size="xs">
        {{ (log.level ?? '').toUpperCase() }}
      </app-badge>
      <span v-if="hasRepeats" class="repeat">×{{ log.repeatCount }}</span>
    </app-flex>

    <div class="message">
      <pre>{{ formattedMessage }}</pre>
    </div>

    <div v-if="hasStack" class="stack">
      <hr />
      <div class="label">Stack:</div>
      <pre>{{ log.context?.stack }}</pre>
    </div>

    <div v-if="hasContext" class="context">
      <hr />
      <div class="label">Context:</div>
      <pre>{{ formattedContext }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { I18N, type LogRecord, type ThemeVariable } from 'orgnote-api';
import AppBadge from './AppBadge.vue';
import AppDate from './AppDate.vue';
import { copyToClipboard } from 'src/utils/clipboard';
import { api } from 'src/boot/api';
import { useI18n } from 'vue-i18n';
import AppFlex from 'src/components/AppFlex.vue';
import { to } from 'orgnote-api/utils';

interface Props {
  log: LogRecord;
  position?: number;
  minimal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  position: 0,
  minimal: false,
});

const formattedMessage = computed(() => {
  const msg = props.log.message;

  const safeParse = to(() => JSON.parse(msg));
  const parsed = safeParse();
  if (parsed.isErr()) return msg;
  return JSON.stringify(parsed.value, null, 2);
});

const extractContext = (context?: Record<string, unknown>): Record<string, unknown> => {
  if (!context) return {};
  const contextCopy = { ...context };
  delete contextCopy.stack;
  delete contextCopy.cause;
  return contextCopy;
};

const hasStack = computed(() => Boolean(props.log.context?.stack));

const hasContext = computed(() => {
  const ctx = extractContext(props.log.context);
  return Object.keys(ctx).length > 0;
});

const hasRepeats = computed(() => (props.log.repeatCount ?? 1) > 1);

const formattedContext = computed(() => {
  const ctx = extractContext(props.log.context);
  return JSON.stringify(ctx, null, 2);
});

const formatLogAsText = (): string => {
  const parts: string[] = [];
  const timestamp = props.log.ts instanceof Date ? props.log.ts : new Date(props.log.ts);

  parts.push(`[${props.position}] ${timestamp.toISOString()}`);

  if (props.log.context?.stack) {
    parts.push(String(props.log.context.stack));
  } else {
    parts.push(formattedMessage.value);
  }

  if (hasRepeats.value) {
    parts.push(`Repeat count: ${props.log.repeatCount ?? 1}`);
    if (props.log.firstTs && props.log.lastTs) {
      parts.push(
        `First occurrence: ${new Date(props.log.firstTs).toISOString()}`,
        `Last occurrence: ${new Date(props.log.lastTs).toISOString()}`,
      );
    }
  }

  if (hasContext.value) {
    parts.push(`Context: ${formattedContext.value}`);
  }

  return parts.join('\n');
};

const { t } = useI18n();

const handleClick = async (): Promise<void> => {
  const text = formatLogAsText();
  await copyToClipboard(text);
  api.core.useNotifications().notify({
    message: t(I18N.COPIED_TO_CLIPBOARD),
    level: 'info',
    timeout: 2000,
  });
};

const levelColors: Record<string, ThemeVariable> = {
  error: 'red',
  warn: 'yellow',
  info: 'blue',
  debug: 'fg',
  trace: 'fg',
};

const getLevelColor = (level?: string): ThemeVariable => {
  return (level ? levelColors[level.toLowerCase()] : undefined) ?? 'fg';
};
</script>

<style scoped lang="scss">
$level-colors: (
  error: var(--red),
  warn: var(--yellow),
  info: var(--blue),
  debug: var(--fg),
  trace: var(--fg),
);

.log-entry {
  @include interactive-no-select;
  width: 100%;
  padding: var(--padding-lg);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--margin-sm);
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }

  @each $level, $color in $level-colors {
    @media (hover: hover) and (pointer: fine) {
      &.#{$level}:hover {
        background: color-mix(in srgb, $color, transparent 95%);
      }
    }
  }
}

.header {
  & {
    margin-bottom: var(--margin-md);
  }
}

.number {
  @include fontify(var(--font-size-xs), var(--font-weight-medium), var(--fg));
}

.repeat {
  @include fontify(var(--font-size-xs), var(--font-weight-medium), var(--fg));

  & {
    margin-left: auto;
    padding: 0 var(--padding-md);
    border-radius: var(--border-radius-sm);
    background: var(--border-default);
  }
}

pre {
  @include fontify(var(--font-size-sm), var(--font-weight-normal), var(--fg));

  & {
    margin: 0;
    padding: var(--padding-xs);
    background: transparent;
    border-radius: var(--border-radius-sm);
    overflow-x: auto;
    font-family: ui-monospace, monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.message {
  @include fontify(var(--font-size-base), var(--font-weight-normal), var(--fg));

  & {
    margin-bottom: var(--margin-sm);
    word-break: break-word;
  }
}

.stack,
.context {
  margin-top: var(--margin-sm);
}

.label {
  @include fontify(var(--font-size-sm), var(--font-weight-medium), var(--fg));

  & {
    display: block;
    padding: var(--padding-md);
  }
}
</style>
