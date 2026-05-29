import { validatePayload } from '@directus/utils';
import { isArray, mergeWith } from 'lodash';

/**
 * Ported from directus-main/app/src/utils/apply-conditions.ts
 * Evaluates a field's conditions against the current item values
 * and returns the field with its effective meta (hidden, required, readonly, options).
 */
export function applyConditions(item: Record<string, any>, field: any): any {
  if (!field.meta || !Array.isArray(field.meta?.conditions)) return field;

  const conditions = [...field.meta.conditions].reverse();

  const matchingCondition = conditions.find((condition: any) => {
    if (!condition.rule || Object.keys(condition.rule).length !== 1) return false;
    const errors = validatePayload(condition.rule, item, { requireAll: true });
    return errors.length === 0;
  });

  if (matchingCondition) {
    return {
      ...field,
      meta: mergeWith(
        {},
        field.meta,
        {
          readonly: matchingCondition.readonly,
          options: matchingCondition.options,
          hidden: matchingCondition.hidden,
          required: matchingCondition.required,
          clear_hidden_value_on_save: matchingCondition.clear_hidden_value_on_save,
        },
        (objValue: any, srcValue: any) => {
          if (isArray(objValue) && isArray(srcValue)) return srcValue;
          return undefined;
        },
      ),
    };
  }

  return field;
}
