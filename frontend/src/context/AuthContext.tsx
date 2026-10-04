import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { api } from '../services/api'

export type User = { id: string; name: string; email: string }
type AuthContextValue = { user: User | null; login: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => void }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('cloudtask.user')
    return stored ? JSON.parse(stored) as User : null
  })
  const save = (data: { user: User; accessToken: string; refreshToken: string }) => {
    setUser(data.user)
    localStorage.setItem('cloudtask.user', JSON.stringify(data.user))
    localStorage.setItem('cloudtask.accessToken', data.accessToken)
    localStorage.setItem('cloudtask.refreshToken', data.refreshToken)
  }
  const login = useCallback(async (email: string, password: string) => save((await api.post('/auth/login', { email, password })).data), [])
  const register = useCallback(async (name: string, email: string, password: string) => save((await api.post('/auth/register', { name, email, password })).data), [])
  const logout = useCallback(() => {
    setUser(null)
    for (const key of ['cloudtask.user', 'cloudtask.accessToken', 'cloudtask.refreshToken']) localStorage.removeItem(key)
  }, [])
  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
