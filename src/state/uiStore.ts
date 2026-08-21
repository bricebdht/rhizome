import { create } from 'zustand'

/**
 * Transient UI state — the demo slice, and the pattern every other slice
 * should copy. `isNavOpen` is a placeholder: there is no nav yet.
 */
interface UiState {
  isNavOpen: boolean
  openNav: () => void
  closeNav: () => void
  toggleNav: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  isNavOpen: false,
  openNav: () => set({ isNavOpen: true }),
  closeNav: () => set({ isNavOpen: false }),
  toggleNav: () => set((state) => ({ isNavOpen: !state.isNavOpen })),
}))
