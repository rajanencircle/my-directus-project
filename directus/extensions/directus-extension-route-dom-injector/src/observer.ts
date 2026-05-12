import { matchRoute } from './routeMatcher';
import { applyActions, applyBodyRouteClass, cleanupActions } from './domActions';
import type { RouteConfig } from './config';

const LOG = '[route-dom-injector]';

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

  console.log(`${LOG} runForCurrentRoute path=${currentPath} matched=[${matches.map(m => m.path).join(', ') || 'none'}]`);

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
      console.log(`${LOG} applying actions for ${match.path}:`, JSON.stringify({ hideLabels: match.actions.hideLabels, addClasses: match.actions.addClasses, scriptsCount: match.actions.scripts?.length ?? 0 }));
      applyActions(match.actions);
    }
  } catch (err) {
    console.error(`${LOG} applyActions error:`, err);
  } finally {
    setTimeout(() => {
      state.isRunning = false;
    }, 80);
  }
}

function onRouteChange(newPath: string): void {
  state.isRunning = false;

  if (state.debounceTimer) clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(runForCurrentRoute, 60);
}

function patchHistoryApi(): void {
  if (state.historyPatched) return;
  state.historyPatched = true;

  const _push = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);

  history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
    _push(data, unused, url);
    onRouteChange(window.location.pathname);
  };

  history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
    _replace(data, unused, url);
    onRouteChange(window.location.pathname);
  };

  window.addEventListener('popstate', () => {
    onRouteChange(window.location.pathname);
  });

}

function startObserver(): void {
  if (state.observer) {
    state.observer.disconnect();
  }

  state.observer = new MutationObserver((mutations: MutationRecord[]) => {
    const currentPath = window.location.pathname;
    if (matchRoute(currentPath, state.config).length === 0) return;

    const hasAddedElement = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node => node instanceof Element)
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
  applyBodyRouteClass('');
  state.lastAppliedPath = null;
  state.isRunning = false;
}

export function getInjectorStatus() {
  return {
    active: state.observer !== null,
    currentPath: window.location.pathname,
    matchedConfig: matchRoute(window.location.pathname, state.config),
    configCount: state.config.length,
  };
}
