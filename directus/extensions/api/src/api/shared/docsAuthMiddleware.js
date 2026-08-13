import { verifyDocsToken } from "./jwt.js";

export const DOCS_COOKIE_NAME = "botg_docs_token";
const DOCS_LOGIN_PATH = "/api/v1/internal-docs/login";

export function loadDocsAuthConfig() {
  const username = process.env.API_DOCS_USERNAME;
  const passwordHash = process.env.API_DOCS_PASSWORD_HASH;
  const jwtSecret = process.env.API_DOCS_JWT_SECRET;

  if (!username || !passwordHash || !jwtSecret) {
    throw new Error(
      "Docs auth not configured — API_DOCS_USERNAME, API_DOCS_PASSWORD_HASH and API_DOCS_JWT_SECRET must all be set.",
    );
  }

  return { username, passwordHash, jwtSecret };
}

function parseCookies(req) {
  const header = req.headers["cookie"];
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return [pair.trim(), ""];
      return [pair.slice(0, idx).trim(), decodeURIComponent(pair.slice(idx + 1).trim())];
    }),
  );
}

// Applied only to the internal-docs routes (JSON spec + Redoc + Swagger UI). Fails
// closed: if the docs credentials never loaded at boot, these routes 503 rather than
// silently serving the docs unauthenticated.
export function createDocsAuthMiddleware(docsAuthState) {
  return function requireDocsAuth(req, res, next) {
    if (!docsAuthState.config) {
      const isJson = req.path.endsWith(".json");
      if (isJson) {
        return res.status(503).json({
          success: false,
          message: "Docs authentication is not configured.",
        });
      }
      return res.status(503).send("Docs authentication is not configured.");
    }

    const cookies = parseCookies(req);
    const token = cookies[DOCS_COOKIE_NAME];
    const payload = token ? verifyDocsToken(token, docsAuthState.config.jwtSecret) : null;

    if (!payload) {
      if (req.path.endsWith(".json")) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }
      return res.redirect(302, DOCS_LOGIN_PATH);
    }

    req.docsUser = payload.sub;
    return next();
  };
}
