/* Maps a token's access_scope to the `audience` value the response transformers use to
 * gate backoffice-only fields (buy prices, margins) via restrictTo()/assembleResponse().
 * web_and_backoffice tokens see the backoffice payload; web tokens get the restricted one.
 * Called once per request (in createCollectionController/products.controller) and cached
 * onto req.context.authorization.audience, rather than recomputed by every handler that
 * needs it. */
export function resolveAudience(apiUser) {
  return apiUser?.accessScope === "web_and_backoffice" ? "backoffice" : "web";
}
