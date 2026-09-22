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
  login: (usernameOrEmail: string, pass: string, targetRole?: UserRole) => Promise<{ success: boolean; error?: string }>
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

  const login = async (usernameOrEmail: string, pass: string): Promise<{ success: boolean; error?: string }> => {
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
      return { success: true }
    } catch (err: any) {
      console.error('Login failed', err)
      setLoading(false)
      let errorMessage = 'Login failed. Please check your credentials.'
      if (err.code === 'ERR_NETWORK' || !err.response) {
        errorMessage = 'Unable to connect to backend server. Please verify Django backend is running on port 8000.'
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.response?.data?.non_field_errors) {
        errorMessage = Array.isArray(err.response.data.non_field_errors)
          ? err.response.data.non_field_errors.join(' ')
          : String(err.response.data.non_field_errors)
      }
      return { success: false, error: errorMessage }
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
    setRole(newRole)
    localStorage.setItem('user_role', newRole)
    if (user) {
      const updatedUser = { ...user, role: newRole }
      setUser(updatedUser)
      localStorage.setItem('user_profile', JSON.stringify(updatedUser))
    }
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
