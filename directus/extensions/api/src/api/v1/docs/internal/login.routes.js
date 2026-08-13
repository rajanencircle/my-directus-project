import bcrypt from "bcryptjs";
import { rateLimiter } from "../../../shared/rateLimiter.js";
import { signDocsToken } from "../../../shared/jwt.js";
import { DOCS_COOKIE_NAME } from "../../../shared/docsAuthMiddleware.js";
import { setRedocCsp } from "../shared/docsCsp.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function readUrlEncodedBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Object.fromEntries(new URLSearchParams(raw))));
    req.on("error", reject);
  });
}

function renderLoginPage({ error } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>BOTG API — Internal Docs Login</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; background: #1a1a2e; }
    form { background: #fff; padding: 32px; border-radius: 8px; width: 280px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    h1 { font-size: 18px; margin: 0 0 20px; color: #1a1a2e; }
    label { display: block; font-size: 13px; margin-bottom: 4px; color: #3b4151; }
    input { width: 100%; box-sizing: border-box; padding: 8px; margin-bottom: 14px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    button { width: 100%; padding: 10px; background: #4f8ef7; color: #fff; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; }
    button:hover { background: #3a7ae0; }
    .error { color: #c0392b; font-size: 13px; margin-bottom: 14px; }
  </style>
</head>
<body>
  <form method="POST" action="/api/v1/internal-docs/login">
    <h1>BOTG API — Internal Docs</h1>
    ${error ? `<div class="error">Invalid username or password.</div>` : ""}
    <label for="username">Username</label>
    <input type="text" id="username" name="username" autocomplete="username" required autofocus>
    <label for="password">Password</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required>
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`;
}

export function setupDocsLoginRoutes(router, docsAuthState) {
  router.get("/v1/internal-docs/login", (_req, res) => {
    setRedocCsp(res);
    res.setHeader("Content-Type", "text/html");
    res.send(renderLoginPage());
  });

  router.post("/v1/internal-docs/login", rateLimiter, async (req, res, next) => {
    try {
      if (!docsAuthState.config) {
        return res.status(503).send("Docs authentication is not configured.");
      }

      const { username, password } = await readUrlEncodedBody(req);
      const { username: expectedUsername, passwordHash, jwtSecret } = docsAuthState.config;

      const usernameOk = typeof username === "string" && username === expectedUsername;
      const passwordOk =
        typeof password === "string" && (await bcrypt.compare(password, passwordHash));

      if (!usernameOk || !passwordOk) {
        setRedocCsp(res);
        res.setHeader("Content-Type", "text/html");
        return res.status(401).send(renderLoginPage({ error: true }));
      }

      const token = signDocsToken(expectedUsername, jwtSecret);
      res.cookie(DOCS_COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: SEVEN_DAYS_MS,
        path: "/api/v1",
      });

      return res.redirect(302, "/api/v1/internal-docs");
    } catch (err) {
      return next(err);
    }
  });

  router.post("/v1/internal-docs/logout", (_req, res) => {
    res.clearCookie(DOCS_COOKIE_NAME, { path: "/api/v1" });
    res.redirect(302, "/api/v1/internal-docs/login");
  });
}
