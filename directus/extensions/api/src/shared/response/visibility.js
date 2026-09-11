/**
 * @description Provides a mechanism to restrict the visibility of response fields to specific audiences.
 *
 * Wraps a value in an object that carries a special `Symbol("hiddenFor")` key holding a Set
 * of permitted audiences. During response assembly (`assembleResponse.js`), if the requested
 * audience is not in that Set, the value is entirely omitted (the key is dropped, not just
 * set to null). If no audience is requested, the value defaults to visible.
 *
 * Transformer definitions use this to securely hide sensitive or internal data (such as
 * margins, B2B pricing, or internal notes) from public or unauthorized audiences. It can be
 * used at any depth within the response object.
 * 
 * @param {*} value - The value to be conditionally hidden.
 * @param {...String} audiences - The list of audience names permitted to see this value.
 * @returns {Object} An object wrapping the value and its visibility restrictions.
 */
export const HIDDEN_FOR = Symbol("hiddenFor");

export function restrictTo(value, ...audiences) {
  return { [HIDDEN_FOR]: new Set(audiences), value };
}
