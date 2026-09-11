import { API_BASE_PATH } from "../api/shared/constants.js";

/**
 * Minimal authenticate filter: grants admin access for all Bearer requests
 * under the API base path so Directus does not reject them before the
 * endpoint's own authMiddleware runs. The actual token validation happens
 * in authMiddleware.
 *
 * Without this, Directus returns its own error for any unrecognized Bearer
 * token — our custom middleware would never execute.
 */
export default function registerAuthHook({ filter }) {
  const prefix = `${API_BASE_PATH}/`;

  filter("authenticate", async (accountability, { req }) => {
    if (!req?.path?.startsWith(prefix)) {
      return accountability;
    }

    const authHeader = req?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return accountability;
    }

    return { ...accountability, admin: true };
  });
}
