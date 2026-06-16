import { getCurrentInstance } from 'vue'

/**
 * Access Directus's app-level $t without depending on useI18n
 * (not exported from @directus/extensions-sdk).
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
