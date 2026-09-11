/**
 * domActions.ts
 *
 * Modular DOM manipulation functions.
 *
 * Label hiding uses direct inline style manipulation — no CSS injection required.
 * This makes it work regardless of when/whether the extension's CSS loads.
 *
 * addClasses still injects a <style> tag for the user-defined class styles,
 * but that is optional (user can define those classes in their own stylesheet).
 */

import type {
  RouteActions,
  HideLabelsByField,
  TabGroupRawStyleAction,
} from "./config";
import { LOG } from "./constants";

// ─── Constants ────────────────────────────────────────────────────────────────

// Attribute we set on hidden labels so we can find and restore them on cleanup.
const HIDDEN_ATTR = "data-rdi-hidden";

// Track which custom classes we've added so cleanup can remove them.
const injectedCustomClasses = new Set<string>();

// ─── Body Route Class ─────────────────────────────────────────────────────────

/**
 * Adds route-derived classes to <body> so external CSS can target specific routes.
 *
 * /content/hotels/123  →  body.body-route--content-hotels-123 (full path, exact item)
 *                          body.body-route--collection--content-hotels (collection-level,
 *                          for CSS that should apply to every item in the collection
 *                          without needing a `[class*=...]` wildcard selector)
 *
 * All previous body-route--* classes are removed first.
 */
export function applyBodyRouteClass(path: string): void {
  Array.from(document.body.classList)
    .filter((c) => c.startsWith("body-route--"))
    .forEach((c) => document.body.classList.remove(c));

  const segments = path.split("/").filter(Boolean);
  if (segments.length > 0) {
    document.body.classList.add(`body-route--${segments.join("-")}`);
  }
  if (segments.length > 2) {
    document.body.classList.add(
      `body-route--collection--${segments.slice(0, 2).join("-")}`,
    );
  }
}

// ─── Hide Labels ──────────────────────────────────────────────────────────────

/**
 * Hides the Directus field label for a single field element.
 *
 * Directus renders labels as:
 *   [data-field="x"] > .v-menu > .v-menu-activator > .field-label
 *
 * We set display:none directly on .field-label (inline style, no CSS needed).
 * A marker attribute is added so cleanup can find and restore these elements.
 */
function hideLabelForField(fieldEl: HTMLElement): void {
  const selectors = [
    ".field-label",
    ".form-field-label",
    ".label",
    ".v-form-field-label",
    ".v-label",
    "label",
  ];
  let labelEl: HTMLElement | null = null;

  for (const selector of selectors) {
    labelEl = fieldEl.querySelector<HTMLElement>(selector);
    if (labelEl) break;
  }

  if (labelEl && !labelEl.hasAttribute(HIDDEN_ATTR)) {
    labelEl.setAttribute(HIDDEN_ATTR, "true");
    labelEl.style.display = "none";
  }
}

/**
 * Hides field labels based on the hideLabels config value.
 *
 * - `true`               → hide every [data-field] label on the page
 * - `{ fields: [...] }` → hide only the listed field names
 */
export function handleHideLabels(config: true | HideLabelsByField): void {
  if (config === true) {
    document
      .querySelectorAll<HTMLElement>("[data-field]")
      .forEach(hideLabelForField);
  } else if (config?.fields) {
    config.fields.forEach((fieldName) => {
      const fieldEl = document.querySelector<HTMLElement>(
        `[data-field="${fieldName}"]`,
      );
      if (fieldEl) hideLabelForField(fieldEl);
    });
  }
}

// ─── Add Classes ─────────────────────────────────────────────────────────────

/**
 * Adds CSS classes to all elements matching the given selectors.
 * Idempotent — won't re-add a class already present.
 */
export function handleAddClasses(
  actions: Array<{ selector: string; className: string }>,
): void {
  actions.forEach(({ selector, className }) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (!el.classList.contains(className)) {
        el.classList.add(className);
        injectedCustomClasses.add(className);
      }
    });
  });
}

// ─── Tab Group Raw Styles ─────────────────────────────────────────────────────

const TAB_STYLED_ATTR = "data-rdi-tab-styled";

// Attribute we set on tab-list spacers / overflow buttons we hide.
const TAB_SPACER_ATTR = "data-rdi-tab-spacer-hidden";

/**
 * For each tab ID in the action, finds the matching tab panel by its ID suffix
 * (e.g. "-content-master_data_group"), locates its first .group-raw child inside
 * .v-form, and applies the configured inline styles with !important priority.
 *
 * Uses $= (ends-with) so the dynamic numeric prefix (reka-tabs-v-32-...) is ignored.
 * Idempotent: skips elements already marked with data-rdi-tab-styled.
 */
// tabIds we've already warned about, so a panel that's simply not mounted
// yet (e.g. an inactive tab) doesn't spam the console on every observer tick.
const warnedMissingPanels = new Set<string>();

export function handleTabGroupRawStyles(
  actions: TabGroupRawStyleAction[],
): void {
  actions.forEach(({ tabIds, styles }) => {
    tabIds.forEach((tabId) => {
      // The panel's id ends with "-content-{tabId}" regardless of the dynamic numeric prefix.
      const panel = document.querySelector<HTMLElement>(
        `[id$="-content-${tabId}"]`,
      );
      if (!panel) {
        if (!warnedMissingPanels.has(tabId)) {
          warnedMissingPanels.add(tabId);
          console.warn(
            `${LOG} tabGroupRawStyles: no panel found ending in "-content-${tabId}" ` +
              `(may be unmounted, or the Reka UI panel id format changed)`,
          );
        }
        return;
      }
      warnedMissingPanels.delete(tabId);

      const firstGroupRaw = panel.querySelector<HTMLElement>(
        ":scope > .v-form > .group-raw",
      );
      if (!firstGroupRaw || firstGroupRaw.hasAttribute(TAB_STYLED_ATTR)) return;

      // Record exactly which properties we set (comma-separated) so cleanup
      // can remove precisely those, regardless of what the config lists.
      firstGroupRaw.setAttribute(TAB_STYLED_ATTR, Object.keys(styles).join(","));
      Object.entries(styles).forEach(([prop, value]) => {
        firstGroupRaw.style.setProperty(prop, value, "important");
      });
    });
  });
}

// ─── Sticky Tab Bar (Universal Cross-Browser) ───────────────────────────────
//
// IMPORTANT: this only ever toggles a class and sets CSS custom properties
// on the EXISTING `.tab-list` node — it never inserts, removes, or moves
// DOM nodes. `.tab-list` is rendered by Vue (Directus core); restructuring
// its parent/children from outside Vue's control (e.g. wrapping it in a
// new element) fights Vue's own patching of that subtree and can silently
// break re-renders. Mutating classList/style on the node Vue already owns
// is safe — the same pattern `hideLabelForField` above uses.

const STUCK_CLASS = "rdi-stuck";

interface StickyEntry {
  groupTabs: HTMLElement;
  initialDelta: number;
}

const stickyEntries = new WeakMap<HTMLElement, StickyEntry>();
let globalScrollHandlerAttached = false;
const activeTabLists = new Set<HTMLElement>();

function isElementScrolled(el: HTMLElement): boolean {
  if (window.scrollY > 4 || window.pageYOffset > 4 || document.documentElement.scrollTop > 4) {
    return true;
  }
  let parent = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    if (parent.scrollTop > 4) return true;
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Measures how far `tabList`'s box falls short of the full-width ancestor
 * (the nearest `.v-form.grid`/content container), and writes that as CSS
 * custom properties on `tabList` itself. The CSS `::before` backdrop reads
 * these instead of a hardcoded `-48px`, so it always spans the real content
 * width regardless of viewport size, zoom, or sidebar width.
 */
function updateStickyBackdropOffsets(tabList: HTMLElement): void {
  const container =
    tabList.closest<HTMLElement>(".v-form.grid") ??
    tabList.closest<HTMLElement>(".group-tabs")?.parentElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const tabRect = tabList.getBoundingClientRect();

  // CSS `left: Npx` on an absolutely-positioned child means the child's left
  // edge is N px from the *parent's* left edge. A negative value extends the
  // child to the LEFT of the parent — which is what we want when the container
  // is wider than the tab-list on that side.
  //
  // CSS `right: Npx` is the mirror: a *negative* value extends the child to
  // the RIGHT of the parent's right edge. So rightOffset (positive when the
  // container is wider) must be negated.
  const leftOffset  = containerRect.left  - tabRect.left;   // already correct sign
  const rightOffset = -(containerRect.right - tabRect.right); // negate for CSS `right`

  tabList.style.setProperty("--rdi-bg-left",  `${leftOffset}px`);
  tabList.style.setProperty("--rdi-bg-right", `${rightOffset}px`);
}

function stickyResizeHandler(): void {
  activeTabLists.forEach(updateStickyBackdropOffsets);
  globalCheckAllStickyTabs();
}

function globalCheckAllStickyTabs(): void {
  activeTabLists.forEach((tabList) => {
    if (!tabList.isConnected) {
      activeTabLists.delete(tabList);
      stickyEntries.delete(tabList);
      return;
    }

    const entry = stickyEntries.get(tabList);
    if (!entry) return;

    // Must be physically scrolled in the scroll container
    if (!isElementScrolled(tabList)) {
      tabList.classList.remove(STUCK_CLASS);
      return;
    }

    const groupTop = entry.groupTabs.getBoundingClientRect().top;
    const tabTop = tabList.getBoundingClientRect().top;
    const currentDelta = tabTop - groupTop;

    // The tab bar is stuck when parent has scrolled relative to the pinned tab list
    const isStuck = currentDelta > entry.initialDelta + 3;
    tabList.classList.toggle(STUCK_CLASS, isStuck);
  });
}

/**
 * Universal cross-browser sticky tab handler.
 * Records initial resting delta on mount; guarantees NO stuck class at top.
 */
export function handleStickyTabBar(): void {
  document
    .querySelectorAll<HTMLElement>(
      ".group-tabs.full > .tab-list, .group-tabs > .tab-list",
    )
    .forEach((tabList) => {
      // Already registered — re-running (e.g. on a later MutationObserver
      // tick) must not re-measure initialDelta, since the page may already
      // be scrolled by then, which would poison the stuck/not-stuck baseline.
      if (activeTabLists.has(tabList)) return;

      const groupTabs =
        tabList.closest<HTMLElement>(".group-tabs") ?? tabList.parentElement;
      if (!groupTabs) return;

      const groupTop = groupTabs.getBoundingClientRect().top;
      const tabTop = tabList.getBoundingClientRect().top;
      const initialDelta = tabTop - groupTop;

      activeTabLists.add(tabList);
      stickyEntries.set(tabList, { groupTabs, initialDelta });
      updateStickyBackdropOffsets(tabList);

      // Always guarantee no stuck class at mount time
      tabList.classList.remove(STUCK_CLASS);

      // Hide non-tab children (spacers, overflow/scroll indicators) that would
      // appear as a phantom box against our gray tab-list background.
      // We mark them so cleanupActions can restore them on route exit.
      tabList
        .querySelectorAll<HTMLElement>(`:scope > :not([role="tab"])`)
        .forEach((el) => {
          if (!el.hasAttribute(TAB_SPACER_ATTR)) {
            el.setAttribute(TAB_SPACER_ATTR, el.style.display || "");
            el.style.display = "none";
          }
        });
    });

  if (!globalScrollHandlerAttached) {
    globalScrollHandlerAttached = true;
    window.addEventListener("scroll", globalCheckAllStickyTabs, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", stickyResizeHandler, { passive: true });
  }

  globalCheckAllStickyTabs();
}

/**
 * Removes the scroll/resize listeners registered by handleStickyTabBar and
 * resets the attach flag, so a later initRouteDomInjector() can re-attach
 * them cleanly. Call this from destroyRouteDomInjector, not from the
 * per-route cleanupActions — the listeners should outlive individual route
 * changes and only go away when the whole injector is torn down.
 */
export function teardownStickyTabBar(): void {
  if (!globalScrollHandlerAttached) return;
  window.removeEventListener("scroll", globalCheckAllStickyTabs, {
    capture: true,
  } as EventListenerOptions);
  window.removeEventListener("resize", stickyResizeHandler);
  globalScrollHandlerAttached = false;
}

// ─── Run Scripts ─────────────────────────────────────────────────────────────

/**
 * Runs each script function from the route config.
 * Errors are swallowed so one bad script doesn't break others.
 */
export function handleRunScripts(scripts: Array<() => void>): void {
  scripts.forEach((fn, i) => {
    try {
      fn();
    } catch (err) {
      console.error(`${LOG} script[${i}] threw:`, err);
    }
  });
}

// ─── Apply All Actions ───────────────────────────────────────────────────────

/**
 * Dispatcher: runs all actions for a matched route.
 */
export function applyActions(actions: RouteActions): void {
  if (actions.hideLabels !== undefined) {
    handleHideLabels(actions.hideLabels);
  }
  if (actions.addClasses?.length) {
    handleAddClasses(actions.addClasses);
  }
  if (actions.tabGroupRawStyles?.length) {
    handleTabGroupRawStyles(actions.tabGroupRawStyles);
  }
  if (actions.scripts?.length) {
    handleRunScripts(actions.scripts);
  }
  handleStickyTabBar();
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Restores all hidden labels and removes all injected classes.
 * Called when navigating away from a matched route.
 */
export function cleanupActions(): void {
  // Restore hidden labels
  document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`).forEach((el) => {
    el.style.display = "";
    el.removeAttribute(HIDDEN_ATTR);
  });

  // Remove custom classes
  injectedCustomClasses.forEach((className) => {
    document.querySelectorAll<HTMLElement>(`.${className}`).forEach((el) => {
      el.classList.remove(className);
    });
  });
  injectedCustomClasses.clear();

  // Remove tab group raw inline styles — only the properties we actually set
  document
    .querySelectorAll<HTMLElement>(`[${TAB_STYLED_ATTR}]`)
    .forEach((el) => {
      const appliedProps = el.getAttribute(TAB_STYLED_ATTR) ?? "";
      appliedProps.split(",").filter(Boolean).forEach((prop) => {
        el.style.removeProperty(prop);
      });
      el.removeAttribute(TAB_STYLED_ATTR);
    });

  // Restore hidden tab-list spacers / overflow buttons
  document.querySelectorAll<HTMLElement>(`[${TAB_SPACER_ATTR}]`).forEach((el) => {
    const original = el.getAttribute(TAB_SPACER_ATTR) ?? "";
    el.style.display = original;
    el.removeAttribute(TAB_SPACER_ATTR);
  });

  // Remove sticky-tab-bar references
  activeTabLists.forEach((tabList) => {
    tabList.classList.remove(STUCK_CLASS);
    tabList.style.removeProperty("--rdi-bg-left");
    tabList.style.removeProperty("--rdi-bg-right");
  });
  activeTabLists.clear();
}
