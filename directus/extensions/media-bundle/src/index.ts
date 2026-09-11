/**
 * Presence of this top-level `src/` directory is required by the existing
 * Directus extensions CI (build-extensions.yml / Upsun), which only builds
 * extensions when `${ext}/src` exists.
 *
 * media-bundle is a Directus *bundle*: real entrypoints live under nested
 * packages (see package.json → directus:extension.entries). This file is not
 * an entrypoint; do not import it.
 */
export {};
