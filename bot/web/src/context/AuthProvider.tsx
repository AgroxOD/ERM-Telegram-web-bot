// Контекст аутентификации, хранит токен и пользователя
import { useEffect, useState, type ReactNode } from 'react'
import { getProfile } from '../services/auth'
import { AuthContext } from './AuthContext'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<Record<string, unknown> | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token') || localStorage.getItem('token')
    if (t) {
      setToken(t)
      localStorage.setItem('token', t)
      getProfile(t)
        .then(setUser)
        .catch(() => {
          setToken(null)
          localStorage.removeItem('token')
        })
    }
  }, [])
  const logout = () => { setToken(null); setUser(null); localStorage.removeItem('token') }
  return (
    <AuthContext.Provider value={{ token, user, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

