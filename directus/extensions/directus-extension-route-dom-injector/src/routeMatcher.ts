/**
 * routeMatcher.ts
 *
 * Pure functions for matching the current path against the route config.
 * No DOM access, no side effects — easy to unit test.
 */

import type { RouteConfig } from './config';

/**
 * Finds ALL config entries whose path matches `currentPath`.
 *
 * Matching rules:
 * - `children: true`  → matches if currentPath starts with entry.path
 * - `children: false` → matches only if currentPath === entry.path
 *
 * Returns every match in config order (general → specific), so parent-route
 * actions are applied before child-route actions.
 */
export function matchRoute(currentPath: string, config: RouteConfig[]): RouteConfig[] {
  const path = currentPath.startsWith('/admin') ? currentPath.replace('/admin', '') : currentPath;

  return config.filter(entry => {
    if (entry.children) {
      const prefix = entry.path.endsWith('/') ? entry.path : entry.path + '/';
      return path === entry.path || path.startsWith(prefix);
    } else {
      return path === entry.path;
    }
  });
}

/**
 * Convenience: returns true if the given path matches any configured route.
 */
export function isMatchedRoute(currentPath: string, config: RouteConfig[]): boolean {
  return matchRoute(currentPath, config).length > 0;
}
