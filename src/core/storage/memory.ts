import type { Storage } from './storage'

/**
 * In-memory `Storage`, for tests and for any environment where persistence
 * is neither available nor wanted. Each instance owns its own map, so tests
 * don't leak state into each other.
 */
export function createMemoryStorage(initial?: Readonly<Record<string, string>>): Storage {
  const store = new Map<string, string>(Object.entries(initial ?? {}))

  return {
    get(key) {
      return Promise.resolve(store.get(key) ?? null)
    },
    set(key, value) {
      store.set(key, value)
      return Promise.resolve()
    },
    remove(key) {
      store.delete(key)
      return Promise.resolve()
    },
  }
}
