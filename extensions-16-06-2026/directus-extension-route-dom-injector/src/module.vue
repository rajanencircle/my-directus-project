<template>
  <private-view title="Route DOM Injector">
    <template #headline>
      <v-breadcrumb :items="[{ name: 'Route DOM Injector', to: '' }]" />
    </template>

    <template #title-outer:prepend>
      <v-button class="header-icon" rounded disabled icon secondary>
        <v-icon name="tune" />
      </v-button>
    </template>

    <!-- ── Status Banner ── -->
    <div class="rdi-page">
      <v-notice :type="status.active ? 'success' : 'warning'" class="status-banner">
        <template #icon>
          <v-icon :name="status.active ? 'check_circle' : 'warning'" />
        </template>
        Observer is <strong>{{ status.active ? 'active' : 'inactive' }}</strong>
        &nbsp;—&nbsp;monitoring {{ status.configCount }} route(s).
      </v-notice>

      <!-- ── Current Route Card ── -->
      <div class="rdi-card">
        <h3 class="rdi-card__title">
          <v-icon name="location_on" small />
          Current Route
        </h3>

        <div class="rdi-code">{{ status.currentPath }}</div>

        <div v-if="status.matchedConfig" class="rdi-match">
          <v-chip class="match-chip" active>
            <v-icon name="check" x-small left />
            Matched: {{ status.matchedConfig.path }}
            ({{ status.matchedConfig.children ? 'prefix' : 'exact' }})
          </v-chip>
          <ul class="rdi-actions-list">
            <li v-if="status.matchedConfig.actions.hideLabels">
              <v-icon name="label_off" x-small />
              hideLabels:
              <span v-if="status.matchedConfig.actions.hideLabels === true">
                <em>all fields</em>
              </span>
              <span v-else>
                {{ (status.matchedConfig.actions.hideLabels as any).fields.join(', ') }}
              </span>
            </li>
            <li
              v-for="(ac, i) in status.matchedConfig.actions.addClasses || []"
              :key="i"
            >
              <v-icon name="style" x-small />
              addClass <code>{{ ac.className }}</code> to <code>{{ ac.selector }}</code>
            </li>
          </ul>
        </div>

        <v-notice v-else type="info" class="no-match">
          No configured route matches the current path.
        </v-notice>
      </div>

      <!-- ── All Configured Routes ── -->
      <div class="rdi-card">
        <h3 class="rdi-card__title">
          <v-icon name="route" small />
          Configured Routes
        </h3>

        <div
          v-for="(entry, index) in allConfig"
          :key="index"
          class="rdi-route-entry"
          :class="{ 'rdi-route-entry--active': status.matchedConfig === entry }"
        >
          <div class="rdi-route-entry__header">
            <code class="rdi-route-entry__path">{{ entry.path }}</code>
            <v-chip x-small :active="entry.children">
              {{ entry.children ? 'prefix' : 'exact' }}
            </v-chip>
          </div>

          <ul class="rdi-route-entry__actions">
            <li v-if="entry.actions.hideLabels">
              <v-icon name="label_off" x-small />
              <span v-if="entry.actions.hideLabels === true">Hide all labels</span>
              <span v-else>
                Hide labels for:
                {{ (entry.actions.hideLabels as any).fields.join(', ') }}
              </span>
            </li>
            <li
              v-for="(ac, i) in entry.actions.addClasses || []"
              :key="i"
            >
              <v-icon name="style" x-small />
              Add <code>{{ ac.className }}</code> to <code>{{ ac.selector }}</code>
            </li>
          </ul>
        </div>
      </div>

      <!-- ── Instructions ── -->
      <div class="rdi-card rdi-card--muted">
        <h3 class="rdi-card__title">
          <v-icon name="info" small />
          How to configure
        </h3>
        <p>
          Edit <code>src/config.ts</code> to add, remove, or modify route rules.
          Rebuild the extension (<code>npm run build</code>) and restart Directus
          to apply changes.
        </p>
        <p>
          The injector runs globally — it does not require navigating to this page.
          It activates automatically via a MutationObserver and History API patching
          as soon as Directus loads the extension.
        </p>
      </div>
    </div>
  </private-view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import routeConfig from './config';
import { getInjectorStatus } from './observer';
import type { RouteConfig } from './config';

// ── Reactive State ─────────────────────────────────────────────────────────

const allConfig: RouteConfig[] = routeConfig;

const status = ref(getInjectorStatus());

// Poll the injector status every second so the UI stays up to date
// as the user navigates within another browser tab or the same app.
let pollInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  pollInterval = setInterval(() => {
    status.value = getInjectorStatus();
  }, 1000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.rdi-page {
  padding: var(--content-padding);
  padding-top: var(--content-padding-top);
  padding-bottom: var(--content-padding-bottom);
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-banner {
  margin-bottom: 0;
}

/* ── Card ── */
.rdi-card {
  background: var(--theme--background-normal, var(--background-normal));
  border-radius: var(--theme--border-radius, 6px);
  border: 1px solid var(--theme--border-color, var(--border-subdued));
  padding: 20px 24px;
}

.rdi-card--muted {
  background: var(--theme--background-subdued, var(--background-subdued));
}

.rdi-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
}

/* ── Code Block ── */
.rdi-code {
  font-family: var(--theme--fonts--mono--font-family, monospace);
  font-size: 13px;
  background: var(--theme--background-subdued, var(--background-subdued));
  padding: 8px 12px;
  border-radius: 4px;
  color: var(--theme--primary, var(--primary));
  margin-bottom: 12px;
}

/* ── Match Result ── */
.rdi-match {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-chip {
  align-self: flex-start;
}

.rdi-actions-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rdi-actions-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.no-match {
  margin-top: 8px;
}

/* ── Route Entry ── */
.rdi-route-entry {
  padding: 12px 14px;
  border-radius: 4px;
  border: 1px solid var(--theme--border-color, var(--border-subdued));
  margin-bottom: 10px;
}

.rdi-route-entry:last-child {
  margin-bottom: 0;
}

.rdi-route-entry--active {
  border-color: var(--theme--primary, var(--primary));
  background: color-mix(in srgb, var(--theme--primary, #6644ff) 5%, transparent);
}

.rdi-route-entry__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.rdi-route-entry__path {
  font-family: var(--theme--fonts--mono--font-family, monospace);
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--primary, var(--primary));
}

.rdi-route-entry__actions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rdi-route-entry__actions li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
}

/* ── Instructions ── */
.rdi-card--muted p {
  font-size: 13px;
  line-height: 1.6;
  color: var(--theme--foreground-subdued, var(--foreground-subdued));
  margin: 0 0 10px;
}

.rdi-card--muted p:last-child {
  margin-bottom: 0;
}

code {
  font-family: var(--theme--fonts--mono--font-family, monospace);
  background: var(--theme--background, var(--background-page));
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
