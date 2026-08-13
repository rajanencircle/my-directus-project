// The single mechanism for audience-scoped visibility, usable at ANY depth inside a
// fieldDef's value — not just at the top level. Wrap a value (a whole nested object, an
// array item's property, whatever) with `restrictTo(value, ...audiences)` to make it
// disappear entirely (the containing key is omitted, not set to null) when
// `assembleResponse` is called for an audience not in that list. Omitting the audience
// argument to assembleResponse entirely (today's every backoffice call site) always
// resolves every restricted value as visible — restriction only ever narrows what's shown
// for an explicitly-requested audience, so nothing changes for existing callers.
export const HIDDEN_FOR = Symbol("hiddenFor");

export function restrictTo(value, ...audiences) {
  return { [HIDDEN_FOR]: new Set(audiences), value };
}
