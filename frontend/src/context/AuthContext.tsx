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

const defaultUserForRole = (r: UserRole): UserProfile => {
  switch (r) {
    case 'TEAM_LEAD':
      return { id: 1, username: 'teamlead', email: 'tl@procurementos.com', role: 'TEAM_LEAD', first_name: 'Team', last_name: 'Lead', job_title: 'Engineering Lead', work_location: 'Pune HQ', phone: '+91 98765 11111' }
    case 'MANAGER':
      return { id: 2, username: 'manager', email: 'mgr@procurementos.com', role: 'MANAGER', first_name: 'Sarah', last_name: 'Manager', job_title: 'IT Director', work_location: 'Pune HQ', phone: '+91 98765 22222' }
    case 'FINANCE':
      return { id: 3, username: 'finance', email: 'fin@procurementos.com', role: 'FINANCE', first_name: 'David', last_name: 'Finance', job_title: 'VP Finance', work_location: 'Pune HQ', phone: '+91 98765 33333' }
    case 'ADMIN':
      return { id: 4, username: 'admin', email: 'admin@procurementos.com', role: 'ADMIN', first_name: 'Alex', last_name: 'Admin', job_title: 'System Administrator', work_location: 'Pune HQ', phone: '+91 98765 44444' }
    case 'VENDOR':
      return { id: 5, username: 'vendor_dell', email: 'contact@dell.com', role: 'VENDOR', first_name: 'Michael', last_name: 'Dell', vendor_id_code: 'VND-HW-001', job_title: 'Key Account Manager', work_location: 'Bengaluru', phone: '+91 98765 55555' }
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedRole = localStorage.getItem('user_role') as UserRole
    if (savedRole) return defaultUserForRole(savedRole)
    return null
  })
  const [role, setRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('user_role') as UserRole) || null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('access_token') || null
  })
  const [loading, setLoading] = useState(false)

  const login = async (usernameOrEmail: string, pass: string, targetRole?: UserRole): Promise<boolean> => {
    setLoading(true)
    try {
      // Try real DRF JWT login
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

      setToken(access)
      setUser(userObj)
      setRole(userObj.role)
      setLoading(false)
      return true
    } catch {
      // Fallback for seamless demo/quick portal select
      const activeRole = targetRole || 'TEAM_LEAD'
      const mockUser = defaultUserForRole(activeRole)
      localStorage.setItem('access_token', 'demo-jwt-token')
      localStorage.setItem('user_role', activeRole)
      setToken('demo-jwt-token')
      setUser(mockUser)
      setRole(activeRole)
      setLoading(false)
      return true
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    setToken(null)
    setUser(null)
    setRole(null)
  }

  const switchRolePortal = (newRole: UserRole) => {
    const mockUser = defaultUserForRole(newRole)
    localStorage.setItem('user_role', newRole)
    setRole(newRole)
    setUser(mockUser)
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
