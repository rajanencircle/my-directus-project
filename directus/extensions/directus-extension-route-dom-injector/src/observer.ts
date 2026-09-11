import { matchRoute } from "./routeMatcher";
import {
  applyActions,
  applyBodyRouteClass,
  cleanupActions,
  teardownStickyTabBar,
} from "./domActions";
import type { RouteConfig } from "./config";
import { LOG } from "./constants";
export { LOG }; // re-export so existing callers of `import { LOG } from './observer'` still work

interface InjectorState {
  config: RouteConfig[];
  observer: MutationObserver | null;
  isRunning: boolean;
  lastAppliedPath: string | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  historyPatched: boolean;
}

const state: InjectorState = {
  config: [],
  observer: null,
  isRunning: false,
  lastAppliedPath: null,
  debounceTimer: null,
  historyPatched: false,
};

function runForCurrentRoute(): void {
  if (state.isRunning) return;

  const currentPath = window.location.pathname;
  const matches = matchRoute(currentPath, state.config);

  applyBodyRouteClass(currentPath);

  if (matches.length === 0) {
    if (state.lastAppliedPath !== null) {
      cleanupActions();
      state.lastAppliedPath = null;
    }
    return;
  }

  state.isRunning = true;
  state.lastAppliedPath = currentPath;

  try {
    for (const match of matches) {
      applyActions(match.actions);
    }
  } catch (err) {
    console.error(`${LOG} applyActions error:`, err);
  } finally {
    // Release on the next macrotask rather than after an arbitrary 80ms.
    // MutationObserver callbacks fire as microtasks, so any mutation
    // applyActions() itself just caused is delivered and correctly
    // ignored (isRunning is still true) before this runs — but real
    // mutations from Vue's own re-renders aren't held back for 80ms.
    setTimeout(() => {
      state.isRunning = false;
    }, 0);
  }
}

function onRouteChange(): void {
  state.isRunning = false;

  if (state.debounceTimer) clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(runForCurrentRoute, 60);
}

function patchHistoryApi(): void {
  if (state.historyPatched) return;
  state.historyPatched = true;

  const _push = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);

  history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    _push(data, unused, url);
    onRouteChange();
  };

  history.replaceState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    _replace(data, unused, url);
    onRouteChange();
  };

  window.addEventListener("popstate", () => {
    onRouteChange();
  });
}

function startObserver(): void {
  if (state.observer) {
    state.observer.disconnect();
  }

  state.observer = new MutationObserver((mutations: MutationRecord[]) => {
    const currentPath = window.location.pathname;
    if (matchRoute(currentPath, state.config).length === 0) return;

    const hasAddedElement = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => node instanceof Element),
    );

    if (!hasAddedElement) return;

    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
      if (!state.isRunning) {
        runForCurrentRoute();
      }
    }, 50);
  });

  const target = document.body ?? document.documentElement;
  state.observer.observe(target, { childList: true, subtree: true });
}

export function initRouteDomInjector(config: RouteConfig[]): void {
  state.config = config;
  state.isRunning = false;

  patchHistoryApi();
  startObserver();
  runForCurrentRoute();
}

export function destroyRouteDomInjector(): void {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = null;
  }
  cleanupActions();
  teardownStickyTabBar();
  applyBodyRouteClass("");
  state.lastAppliedPath = null;
  state.isRunning = false;
}

export function getInjectorStatus() {
  const matches = matchRoute(window.location.pathname, state.config);
  return {
    active: state.observer !== null,
    currentPath: window.location.pathname,
    matchedConfig: matches.length > 0 ? matches[matches.length - 1] : null,
    configCount: state.config.length,
  };
}
