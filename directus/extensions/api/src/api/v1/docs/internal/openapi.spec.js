import contractSpec from "../contract/BOTG_API_Contract.json" with { type: "json" };

// The internal docs page is a differently-branded presentation of the SAME contract served
// at /api/v1/docs (see docs/contract/openapi.spec.js) — BOTG_API_Contract.json is the single
// source of truth. This used to be a hand-authored, independently-maintained spec describing
// an older/aspirational shape of the API (different field names, phantom endpoints like
// /products/details and /products/limited-list that were never implemented, and a
// {requestId, timestamp} meta shape instead of the real {page, limit, total, returned}) which
// had drifted badly out of sync with both the real routes and the actual contract. Deriving
// from the contract file instead of re-declaring paths/schemas by hand means this page cannot
// drift from the source of truth again.
export const openapiSpec = {
  ...contractSpec,
  info: {
    ...contractSpec.info,
    title: `${contractSpec.info.title} — Internal`,
  }
};
