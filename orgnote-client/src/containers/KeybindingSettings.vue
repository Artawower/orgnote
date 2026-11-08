<template>
  <div class="keybinding-settings">
    <search-input
      appearance="field"
      icon="search"
      v-model="search"
      :placeholder="I18N.SEARCH"
    />

    <template v-for="[context, bindings] in groupedBindings" :key="context">
      <app-description padded>
        {{ context.toUpperCase() }}
      </app-description>

      <menu-group>
        <menu-item v-for="binding in bindings" :key="binding.command" prefer="left">
          {{ binding.title }}

          <template #right>
            <app-flex row align-center gap="xs" class="bindings-right">
              <hotkey-tag
                v-for="(hotkey, i) in effectiveHotkeys(binding.command)"
                :key="i"
                :hotkey="hotkey"
                removable
                @remove="removeHotkey(binding.command, i)"
              />
              <action-button
                v-if="hasUserOverride(binding.command)"
                icon="restart_alt"
                size="sm"
                @click.stop="keybindings.clearHotkeys(binding.command)"
              />
              <hotkey-input
                :has-value="effectiveHotkeys(binding.command).length > 0"
                @confirm="addHotkey(binding.command, $event)"
              />
            </app-flex>
          </template>
        </menu-item>
      </menu-group>
    </template>

    <app-flex v-if="groupedBindings.size === 0" class="empty" center align-center>
      {{ t(I18N.NOT_FOUND) }}
    </app-flex>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toValue } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import { I18N, type Hotkey } from 'orgnote-api';
import Fuse from 'fuse.js';
import MenuItem from './MenuItem.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppDescription from 'src/components/AppDescription.vue';
import ActionButton from 'src/components/ActionButton.vue';
import SearchInput from 'src/components/SearchInput.vue';
import HotkeyTag from 'src/components/HotkeyTag.vue';
import HotkeyInput from 'src/components/HotkeyInput.vue';
import MenuGroup from 'src/components/MenuGroup.vue';
import { hotkeysEqual } from 'src/stores/keybindings';

interface BindingRow {
  command: string;
  title: string;
  context: string;
}

const { t } = useI18n({ useScope: 'global', inheritLocale: true });
const keybindings = api.core.useKeybindings();
const commandsStore = api.core.useCommands();
const notifications = api.core.useNotifications();
const search = ref('');

const interactiveCommands = computed(() =>
  commandsStore.commands.filter((c) => c.interactive && c.command),
);

const filteredCommands = computed(() => {
  const q = search.value.trim();
  if (!q) return interactiveCommands.value;
  const fuse = new Fuse(interactiveCommands.value, {
    keys: [{ name: 'title', getFn: (c) => String(toValue(c.title) ?? '') }, 'command'],
    threshold: 0.4,
  });
  return fuse.search(q).map((r) => r.item);
});

const groupedBindings = computed(() => {
  const map = new Map<string, BindingRow[]>();
  filteredCommands.value.forEach((cmd) => {
    const context = cmd.keybindingContext ?? 'global';
    const title = String(toValue(cmd.title) ?? cmd.command ?? '');
    const row: BindingRow = { command: cmd.command as string, title, context };
    const group = map.get(context) ?? [];
    group.push(row);
    map.set(context, group);
  });
  return map;
});

const effectiveHotkeys = (command: string): Hotkey[] => keybindings.getHotkeys(command);

const hasUserOverride = (command: string): boolean => command in (keybindings.userBindings ?? {});

const addHotkey = (command: string, hotkey: Hotkey): void => {
  const current = effectiveHotkeys(command);
  if (current.some((h) => hotkeysEqual(h, hotkey))) return;
  const conflict = keybindings.findConflict(
    hotkey,
    commandsStore.commands.find((c) => c.command === command)?.keybindingContext ?? 'global',
    command,
  );
  if (conflict) {
    const conflictTitle = commandsStore.get(conflict)?.title;
    const name =
      typeof conflictTitle === 'function' ? conflictTitle() : (conflictTitle ?? conflict);
    notifications.notify({ message: `Conflict with: ${name}`, level: 'warning' });
    return;
  }
  keybindings.setHotkeys(command, [...current, hotkey]);
};

const removeHotkey = (command: string, index: number): void => {
  const current = effectiveHotkeys(command);
  const updated = current.filter((_, i) => i !== index);
  keybindings.setHotkeys(command, updated);
};
</script>

<style lang="scss" scoped>
.keybinding-settings {
  width: 100%;
}

.bindings-right {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.empty {
  padding: var(--padding-xl);
  color: var(--fg-muted);
  font-size: var(--font-size-sm);
}
</style>
