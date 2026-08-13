import jwt from "jsonwebtoken";

export function signDocsToken(username, secret) {
  return jwt.sign({ sub: username }, secret, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

export function verifyDocsToken(token, secret) {
  try {
    return jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}
