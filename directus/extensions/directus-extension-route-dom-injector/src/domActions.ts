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
import { LOG } from "./observer";

// ─── Constants ────────────────────────────────────────────────────────────────

// Attribute we set on hidden labels so we can find and restore them on cleanup.
const HIDDEN_ATTR = "data-rdi-hidden";

// Track which custom classes we've added so cleanup can remove them.
const injectedCustomClasses = new Set<string>();

// ─── Body Route Class ─────────────────────────────────────────────────────────

/**
 * Adds a route-derived class to <body> so external CSS can target specific routes.
 *
 * /content/geo_location/123  →  body.body-route--content-geo_location-123
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

/**
 * For each tab ID in the action, finds the matching tab panel by its ID suffix
 * (e.g. "-content-master_data_group"), locates its first .group-raw child inside
 * .v-form, and applies the configured inline styles with !important priority.
 *
 * Uses $= (ends-with) so the dynamic numeric prefix (reka-tabs-v-32-...) is ignored.
 * Idempotent: skips elements already marked with data-rdi-tab-styled.
 */
export function handleTabGroupRawStyles(
  actions: TabGroupRawStyleAction[],
): void {
  actions.forEach(({ tabIds, styles }) => {
    tabIds.forEach((tabId) => {
      // The panel's id ends with "-content-{tabId}" regardless of the dynamic numeric prefix.
      const panel = document.querySelector<HTMLElement>(
        `[id$="-content-${tabId}"]`,
      );
      if (!panel) return;

      const firstGroupRaw = panel.querySelector<HTMLElement>(
        ":scope > .v-form > .group-raw",
      );
      if (!firstGroupRaw || firstGroupRaw.hasAttribute(TAB_STYLED_ATTR)) return;

      firstGroupRaw.setAttribute(TAB_STYLED_ATTR, "true");
      Object.entries(styles).forEach(([prop, value]) => {
        firstGroupRaw.style.setProperty(prop, value, "important");
      });
    });
  });
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

  // Remove tab group raw inline styles
  document
    .querySelectorAll<HTMLElement>(`[${TAB_STYLED_ATTR}]`)
    .forEach((el) => {
      el.removeAttribute(TAB_STYLED_ATTR);
      el.style.removeProperty("background-color");
      el.style.removeProperty("padding");
      el.style.removeProperty("border");
    });
}
