import type { Storage } from '@/core/storage'

/**
 * Browser `Storage`, wrapping `localStorage`.
 *
 * This is the adapter half of the boundary: it is the only file in the app
 * allowed to touch `localStorage`, and a React Native port replaces it with
 * an `AsyncStorage` equivalent without any core module noticing.
 *
 * Keys are namespaced so Rhizome never collides with anything else served
 * from the same origin.
 */
const PREFIX = 'rhizome:'

const namespaced = (key: string) => `${PREFIX}${key}`

/**
 * `localStorage` throws rather than returning null in a few real situations
 * — Safari private browsing, storage disabled by policy, quota exceeded on
 * write. Persistence is a cache here, never the source of truth (that is
 * the user's PDS), so degrading to "not stored" beats crashing the app.
 */
export function createWebStorage(): Storage {
  return {
    get(key) {
      try {
        return Promise.resolve(localStorage.getItem(namespaced(key)))
      } catch {
        return Promise.resolve(null)
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(namespaced(key), value)
      } catch {
        // Ignored: see the note above.
      }
      return Promise.resolve()
    },
    remove(key) {
      try {
        localStorage.removeItem(namespaced(key))
      } catch {
        // Ignored: see the note above.
      }
      return Promise.resolve()
    },
  }
}
