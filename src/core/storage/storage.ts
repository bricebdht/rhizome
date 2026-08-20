/**
 * Key/value persistence, as the core is allowed to see it.
 *
 * Every method returns a promise even though the web implementation is
 * synchronous. That asymmetry is deliberate: `localStorage` is sync, while
 * `AsyncStorage` and `expo-secure-store` are not. Declaring the interface
 * async today costs one `await`; discovering it later costs an async
 * refactor of every call chain that touches storage.
 *
 * Core modules receive a `Storage` — they never import an implementation.
 * See `src/README.md` for the boundary this belongs to.
 */
export interface Storage {
  /** Resolves to `null` when the key is absent. */
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}
