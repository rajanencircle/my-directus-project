import jwt from "jsonwebtoken";

/* Signs the short-lived session token for the internal docs login (see docsAuthMiddleware.js),
 * not a partner API token — 7-day expiry is fine since it just gates access to the docs UI. */
export function signDocsToken(username, secret) {
  return jwt.sign({ sub: username }, secret, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

/* Returns the decoded payload, or null on any failure (expired/invalid/wrong secret) so
 * callers can treat "not logged in" and "bad token" the same way. */
export function verifyDocsToken(token, secret) {
  try {
    return jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}
