import { getCurrentInstance } from 'vue'

/**
 * Access Directus's app-level $t function without relying on useI18n from
 * @directus/extensions-sdk (which does not export it).
 *
 * Falls back to returning the key when called outside a component setup context.
 */
export function useT() {
  const instance = getCurrentInstance()

  const t = (key: string, values?: Record<string, unknown>): string => {
    const $t = instance?.appContext.config.globalProperties.$t as
      | ((k: string, v?: unknown) => string)
      | undefined

    if (!$t) return key
    return values ? $t(key, values) : $t(key)
  }

  return { t }
}
