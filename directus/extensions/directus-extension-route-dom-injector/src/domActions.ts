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

import type { RouteActions, HideLabelsByField } from "./config";

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
      console.error(`[route-dom-injector] script[${i}] threw:`, err);
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
}
