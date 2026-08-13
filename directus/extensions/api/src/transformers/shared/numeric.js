export const toNumOrNull = (v) =>
  v !== undefined && v !== null ? Number(v) : null;
