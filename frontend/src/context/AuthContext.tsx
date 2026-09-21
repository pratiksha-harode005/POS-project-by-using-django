import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '../api/client'

export type UserRole = 'TEAM_LEAD' | 'MANAGER' | 'FINANCE' | 'ADMIN' | 'VENDOR'

export interface UserProfile {
  id: number
  username: string
  email: string
  role: UserRole
  first_name?: string
  last_name?: string
  vendor_id_code?: string
  department?: number
  work_location?: string
  job_title?: string
  phone?: string
}

interface AuthContextType {
  user: UserProfile | null
  role: UserRole | null
  token: string | null
  login: (usernameOrEmail: string, pass: string, targetRole?: UserRole) => Promise<boolean>
  logout: () => void
  switchRolePortal: (newRole: UserRole) => void
  loading: boolean
}


const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('user_profile')
    if (savedUser) {
      try {
        return JSON.parse(savedUser)
      } catch (e) {
        return null
      }
    }
    return null
  })
  const [role, setRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('user_role') as UserRole) || null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('access_token') || null
  })
  const [loading, setLoading] = useState(false)

  const login = async (usernameOrEmail: string, pass: string): Promise<boolean> => {
    setLoading(true)
    try {
      const res = await apiClient.post('/auth/login/', {
        username: usernameOrEmail,
        password: pass,
      })
      const access = res.data.access
      const refresh = res.data.refresh
      const userObj = res.data.user

      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('user_role', userObj.role)
      localStorage.setItem('user_profile', JSON.stringify(userObj))

      setToken(access)
      setUser(userObj)
      setRole(userObj.role)
      setLoading(false)
      return true
    } catch (err) {
      console.error('Login failed', err)
      setLoading(false)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_profile')
    setToken(null)
    setUser(null)
    setRole(null)
  }

  const switchRolePortal = (newRole: UserRole) => {
    // Deprecated. Strict role binding applies.
    console.warn("switchRolePortal is deprecated. Use real authentication.")
  }

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout, switchRolePortal, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
