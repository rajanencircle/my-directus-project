import { validatePayload } from '@directus/utils';
import { cloneDeep, flatten, isEmpty, isNil } from 'lodash';
import { applyConditions } from './apply-conditions';

/**
 * Ported from directus-main/app/src/utils/validate-item.ts
 *
 * Validates an item against the effective field rules (conditions applied).
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

  // Collect effectively required fields
  const requiredFields = fieldsWithConditions.filter((f) => f.meta?.required === true);

  requiredFields.forEach((field) => {
    applyRulesForRequired(field.field, field, isNew);

    // For array relation fields, treat an empty array as null
    const isEmptyArray = Array.isArray(updatedItem[field.field]) && isEmpty(updatedItem[field.field]);
    if (isEmptyArray) updatedItem[field.field] = null;
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
    (error.details ?? []).map((detail: any) => ({
      code: 'FAILED_VALIDATION',
      field: detail.context?.key ?? detail.path?.join('.') ?? '',
      type: detail.type ?? 'required',
    })),
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
    validationRules._and.push({ [fieldKey]: { _nnull: true } });
  }
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
