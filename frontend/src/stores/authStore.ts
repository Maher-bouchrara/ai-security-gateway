import { create } from 'zustand'
import type { User } from '../types'

interface AuthStore {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: (token, user) => set({
    token,
    user,
    isAuthenticated: true,
  }),

  logout: () => set({
    token: null,
    user: null,
    isAuthenticated: false,
  }),
}))