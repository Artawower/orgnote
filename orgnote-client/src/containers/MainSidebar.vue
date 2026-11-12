<template>
  <app-sidebar side="left" :mini="tabletAbove" :opened="opened" :resizable="tabletAbove">
    <template #mini-top>
      <app-flex class="command-list" column start align-start gap="sm">
        <command-action-button v-for="cmd of sidebarCommands" :command="cmd" :key="cmd" />
      </app-flex>
    </template>
    <template #mini-footer>
      <app-flex class="command-list" column start align-start gap="sm">
        <command-action-button v-for="cmd of footerCommands" :command="cmd" :key="cmd" />
      </app-flex>
    </template>

    <app-flex column class="content-wrapper">
      <animation-wrapper animation-name="fade">
        <div
          v-if="sectionsMenuOpen && !tabletAbove"
          class="sections-overlay"
          @click="closeSectionsMenu"
        />
      </animation-wrapper>

      <div class="sidebar-content">
        <component :is="component" v-bind="componentConfig?.componentProps || {}" />
      </div>

      <visibility-wrapper tablet-below>
        <floating-footer>
          <div v-if="opened && mobileFileSearchActive" class="sidebar-footer-search">
            <search-input
              ref="mobileSearchInputRef"
              appearance="glass"
              v-model="searchQuery"
              :placeholder="I18N.SEARCH"
            >
              <template #actions>
                <command-action-button :command="DefaultCommands.HIDE_MOBILE_FILE_SEARCH" />
              </template>
            </search-input>
          </div>
          <div v-else class="sidebar-footer-surface">
            <animation-wrapper animation-name="fade">
              <div
                v-if="sectionsMenuOpen"
                class="sections-menu"
                @click.stop
              >
                <mobile-sidebar-menu />
              </div>
            </animation-wrapper>
            <mobile-sidebar-selector embedded />
          </div>
        </floating-footer>
      </visibility-wrapper>
    </app-flex>
  </app-sidebar>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import { DefaultCommands, I18N } from 'orgnote-api';
import AppSidebar from 'src/components/AppSidebar.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import SearchInput from 'src/components/SearchInput.vue';
import { useScreenDetection } from 'src/composables/use-screen-detection';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';
import FloatingFooter from 'src/components/FloatingFooter.vue';
import { nextTick, ref, watch } from 'vue';
import MobileSidebarSelector from 'src/containers/MobileSidebarSelector.vue';
import MobileSidebarMenu from 'src/containers/MobileSidebarMenu.vue';
import AnimationWrapper from 'src/components/AnimationWrapper.vue';


const { opened, component, componentConfig } = storeToRefs(api.ui.useSidebar());
const pinnedCommands = api.ui.usePinnedCommands();
const sidebarCommands = pinnedCommands.getCommands('sidebar');
const footerCommands = pinnedCommands.getCommands('sidebar-footer');
const { tabletAbove } = useScreenDetection();

const { searchQuery, mobileFileSearchActive } = storeToRefs(api.core.useFileManager());
const sidebar = api.ui.useSidebar();
const { navMenuOpen: sectionsMenuOpen } = storeToRefs(sidebar);
const { closeNavMenu: closeSectionsMenu } = sidebar;

const mobileSearchInputRef = ref<InstanceType<typeof SearchInput>>();

watch(mobileFileSearchActive, async (active) => {
  if (!active) return;
  await nextTick();
  mobileSearchInputRef.value?.focus();
});

watch(opened, (isOpen) => {
  if (!isOpen) closeSectionsMenu();
});
</script>

<style lang="scss" scoped>
.app-sidebar {
  --scroll-bottom-padding: var(--padding-lg);
}

@include tablet-below {
  .app-sidebar {
    --scroll-bottom-padding: calc(
      var(--footer-height) + var(--footer-wrapper-padding-y) +
        var(--device-padding-bottom, 0px)
    );
  }
}

.footer {
  flex-direction: row-reverse;
  left: 0;
  bottom: 0;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.sidebar-content {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  z-index: 0;
  position: relative;
}

.sections-overlay {
  position: absolute;
  inset: 0;
  z-index: var(--sidebar-sections-z-index);
}

.sidebar-footer-surface {
  margin: 0 var(--footer-wrapper-padding-x) var(--footer-wrapper-padding-y);
  background: var(--footer-bg);
  border: var(--footer-border);
  border-top: var(--glass-border-top);
  border-radius: var(--footer-border-radius);
  -webkit-backdrop-filter: var(--footer-backdrop-filter);
  backdrop-filter: var(--footer-backdrop-filter);
  background-clip: padding-box;
  box-shadow:
    var(--footer-box-shadow),
    0 -2px 8px color-mix(in srgb, var(--fg) 8%, transparent);
  overflow: hidden;

  @include glass-specular;
}

.sections-menu {
  font-size: var(--font-size-sm);
  border-bottom: var(--glass-border);
}

.sidebar-footer-search {
  padding: var(--footer-wrapper-padding);
  padding-top: 0;
}

</style>
