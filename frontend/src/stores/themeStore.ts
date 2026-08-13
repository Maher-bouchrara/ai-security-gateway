import { create } from 'zustand'
import type { Theme } from '../types'

interface ThemeStore {
  theme: Theme
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'dark',

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    localStorage.setItem('theme', newTheme)
    set({ theme: newTheme })
  },
}))