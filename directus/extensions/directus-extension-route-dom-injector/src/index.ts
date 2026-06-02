/**
 * index.ts — Route DOM Injector Extension Entry Point
 *
 * This file is evaluated ONCE when Directus loads the extension at startup.
 * The module definition (exported below) registers the management UI at
 * /route-dom-injector, but the global DOM injection behavior starts here,
 * at module evaluation time, and runs across ALL routes in the admin panel.
 *
 * Execution flow:
 * 1. injectStyles()        → write <style> tag to <head> (once)
 * 2. initRouteDomInjector()→ patch History API + start MutationObserver
 * 3. Export module def     → register management UI in Directus nav
 */

import ModuleComponent from './module.vue';
import routeConfig from './config';
import { initRouteDomInjector } from './observer';

// ── Global Initialization ────────────────────────────────────────────────────
// Runs at extension load time, independent of which route the user is on.

initRouteDomInjector(routeConfig);

// ── Module Registration ───────────────────────────────────────────────────────
// Registers the management/status UI at /route-dom-injector in the Directus nav.

export default {
  id: 'route-dom-injector',
  name: 'Route DOM Injector',
  icon: 'tune',
  routes: [
    {
      path: '',
      component: ModuleComponent,
    },
  ],
};
