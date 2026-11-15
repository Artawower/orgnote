import type { CommandIcon } from 'orgnote-api';
import type { MaybeRef } from 'vue';
import { computed, toValue } from 'vue';

export function useResolvedIcon(icon: MaybeRef<CommandIcon | undefined>) {
  const resolved = computed(() => toValue(icon));

  const iconString = computed(() =>
    typeof resolved.value === 'string' ? resolved.value : undefined,
  );

  const iconComponent = computed(() =>
    resolved.value && typeof resolved.value !== 'string' ? resolved.value : undefined,
  );

  return {
    iconString,
    iconComponent,
  };
}
