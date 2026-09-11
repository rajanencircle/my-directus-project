import { validatePayload } from '@directus/utils';
import { cloneDeep, flatten, isEmpty, isNil } from 'lodash';
import { applyConditions } from './apply-conditions';

/**
 * Ported from directus-main/app/src/utils/validate-item.ts
 *
 * Validates an item against the effective field rules (conditions applied).
 * Required checks follow Data Model `meta.required` (after conditions) only —
 * no hard-coded field lists.
 * Returns an array of validation error extensions compatible with v-form's :validation-errors prop.
 *
 * @param item        Merged item values (defaults + saved + edits)
 * @param fields      All fields for the collection (from fieldsStore)
 * @param isNew       Whether this is a new record (+)
 * @param includeCustomValidations  Also run field.meta.validation rules
 */
export function validateItem(
  item: Record<string, any>,
  fields: any[],
  isNew: boolean,
  includeCustomValidations = true,
): any[] {
  const validationRules: { _and: any[] } = { _and: [] };
  const updatedItem = cloneDeep(item);

  // Apply conditions to get the effective state of each field
  const fieldsWithConditions = fields.map((field) => applyConditions(item, field));

  // Collect effectively required fields from Data Model / conditions only
  const requiredFields = fieldsWithConditions.filter((f) => f.meta?.required === true);
  const requiredFieldKeys = new Set(requiredFields.map((f) => f.field));

  requiredFields.forEach((field) => {
    applyRulesForRequired(field.field, field, isNew);

    // Normalize empty values so required checks catch cleared text / empty relations
    const key = field.field;
    if (isMissingRequiredValue(updatedItem[key])) {
      updatedItem[key] = null;
    }
  });

  // Collect custom validation rules (regex, min, max, etc.)
  if (includeCustomValidations) {
    fields.forEach((field) => {
      if (isNil(updatedItem[field.field])) return;
      const validation = field.meta?.validation as { _and?: any[] } | null;
      validation?._and?.forEach((rule: any) => {
        validationRules._and.push(rule);
      });
    });
  }

  const errors = validatePayload(validationRules, updatedItem).map((error: any) =>
    (error.details ?? []).map((detail: any) => {
      const extensions = joiDetailToErrorExtensions(detail);

      // Match Directus default UI copy: "Value is required"
      if (requiredFieldKeys.has(extensions.field) && (extensions.type === 'nnull' || extensions.type === 'nempty')) {
        extensions.type = 'required';
      }

      return {
        code: 'FAILED_VALIDATION',
        ...extensions,
      };
    }),
  );

  return flatten(errors).map((error: any) => {
    const errorField = fieldsWithConditions.find((f) => f.field === error.field);
    return {
      ...error,
      hidden: errorField?.meta?.hidden ?? false,
      group: errorField?.meta?.group ?? null,
    };
  });

  function applyRulesForRequired(fieldKey: string, field: any, isNew: boolean) {
    if (isNew && isNil(field.schema?.default_value)) {
      validationRules._and.push({ [fieldKey]: { _submitted: true } });
    }
    // Block null/undefined and empty strings for required fields
    validationRules._and.push({ [fieldKey]: { _nnull: true } });
    validationRules._and.push({ [fieldKey]: { _nempty: true } });
  }
}

/** Treat null, undefined, empty/whitespace strings, and empty arrays as missing. */
function isMissingRequiredValue(value: unknown): boolean {
  if (isNil(value)) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && isEmpty(value)) return true;
  return false;
}

/**
 * Map Joi ValidationErrorItem → Directus FAILED_VALIDATION extensions.
 * Ported from @directus/validation joiValidationErrorItemToErrorExtensions so
 * v-form can resolve `validationError.<type>` (e.g. "Value is required").
 */
function joiDetailToErrorExtensions(detail: any): {
  field: string;
  path: (string | number)[];
  type: string;
  valid?: unknown;
  invalid?: unknown;
  substring?: string;
} {
  const extensions: {
    field: string;
    path: (string | number)[];
    type?: string;
    valid?: unknown;
    invalid?: unknown;
    substring?: string;
  } = {
    field: (detail.path?.[0] ?? detail.context?.key ?? '') as string,
    path: (detail.path ?? []).slice(1),
  };

  const joiType: string = detail.type ?? '';

  // eq | in | null | empty
  if (joiType.endsWith('only')) {
    const valids = detail.context?.valids ?? [];
    if (valids.length > 1) {
      extensions.type = 'in';
      extensions.valid = valids;
    } else {
      const valid = valids[0];
      if (valid === null) extensions.type = 'null';
      else if (valid === '') extensions.type = 'empty';
      else {
        extensions.type = 'eq';
        extensions.valid = valid;
      }
    }
  }

  // neq | nin | nnull | nempty  (Joi reports these as any.invalid)
  if (joiType.endsWith('invalid')) {
    const invalids = detail.context?.invalids ?? [];
    if (invalids.length > 1) {
      extensions.type = 'nin';
      extensions.invalid = invalids;
    } else {
      const invalid = invalids[0];
      if (invalid === null) extensions.type = 'nnull';
      else if (invalid === '') extensions.type = 'nempty';
      else {
        extensions.type = 'neq';
        extensions.invalid = invalid;
      }
    }
  }

  if (joiType.endsWith('greater')) {
    extensions.type = 'gt';
    extensions.valid = detail.context?.limit;
  }

  if (joiType.endsWith('min')) {
    extensions.type = 'gte';
    extensions.valid = detail.context?.limit;
  }

  if (joiType.endsWith('less')) {
    extensions.type = 'lt';
    extensions.valid = detail.context?.limit;
  }

  if (joiType.endsWith('max')) {
    extensions.type = 'lte';
    extensions.valid = detail.context?.limit;
  }

  if (joiType.endsWith('contains')) {
    extensions.type = 'contains';
    extensions.substring = detail.context?.substring;
  }

  if (joiType.endsWith('ncontains')) {
    extensions.type = 'ncontains';
    extensions.substring = detail.context?.substring;
  }

  // required (_submitted) — keep after .pattern.base check order like Directus
  if (joiType.endsWith('required') || joiType.endsWith('.base')) {
    extensions.type = 'required';
  }

  if (joiType.endsWith('.pattern.base')) {
    extensions.type = 'regex';
    extensions.invalid = detail.context?.value;
  }

  if (joiType === 'number.unsafe') {
    extensions.type = 'unsafe';
  }

  if (joiType.endsWith('.pattern.name') || joiType.endsWith('.pattern.invert.name')) {
    extensions.type = detail.context?.name;
    const regex = detail.context?.regex?.toString?.() ?? '';
    switch (extensions.type) {
      case 'starts_with':
      case 'nstarts_with':
      case 'istarts_with':
      case 'nistarts_with':
        extensions.substring = regex.substring(2, regex.lastIndexOf('/') - 2);
        break;
      case 'ends_with':
      case 'nends_with':
      case 'iends_with':
      case 'niends_with':
        extensions.substring = regex.substring(3, regex.lastIndexOf('/') - 1);
        break;
    }
  }

  // Fallback so UI never shows raw Joi types like "any.invalid"
  if (!extensions.type) {
    extensions.type = 'required';
  }

  return extensions as {
    field: string;
    path: (string | number)[];
    type: string;
    valid?: unknown;
    invalid?: unknown;
    substring?: string;
  };
}

/**
 * Clear values from edits for fields that are hidden by conditions and have
 * clear_hidden_value_on_save set — mirrors Directus's clearHiddenFieldsByCondition.
 */
export function clearHiddenEdits(
  edits: Record<string, any>,
  fields: any[],
  item: Record<string, any>,
): Record<string, any> {
  const merged = { ...item, ...edits };
  const cleared = cloneDeep(edits);

  for (const field of fields) {
    if (!field.meta?.conditions?.length) continue;
    const effective = applyConditions(merged, field);
    if (effective.meta?.hidden && effective.meta?.clear_hidden_value_on_save) {
      cleared[field.field] = field.schema?.default_value ?? null;
    }
  }

  return cleared;
}
