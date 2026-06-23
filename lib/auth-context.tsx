'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { IS_MOCK, MOCK_COMPANIES } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

export type UserRole = 'admin' | 'member'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
  companyId: string | null
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  canEdit: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  mockLogin: (role: UserRole, companyId?: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  canEdit: false,
  signIn: async () => ({}),
  signOut: async () => {},
  mockLogin: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { setSelectedCompany } = useAppStore()

  useEffect(() => {
    const saved = localStorage.getItem('letus-user')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AuthUser
        setUser(parsed)
        if (parsed.companyId) {
          // header에서 companies 로드 후 처리
        }
      } catch {}
    }
    setLoading(false)
  }, [])

  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) return { error: json.error ?? '로그인 실패' }

      const authUser = json.user as AuthUser
      localStorage.setItem('letus-user', JSON.stringify(authUser))
      setUser(authUser)
      return {}
    } catch {
      return { error: '서버에 연결할 수 없습니다' }
    }
  }

  async function signOut() {
    localStorage.removeItem('letus-user')
    localStorage.removeItem('letus-mock-user')
    setUser(null)
  }

  function mockLogin(role: UserRole, companyId: string | null = null) {
    const company = companyId ? MOCK_COMPANIES.find((c) => c.id === companyId) : null
    const mockUser: AuthUser = {
      id: `mock-${role}-${companyId ?? 'all'}`,
      email: role === 'admin' ? 'admin@letus.co.kr' : `member-${companyId ?? 'all'}@letus.co.kr`,
      name: role === 'admin' ? '관리자' : (company ? `${company.name} 직원` : '일반사용자'),
      role,
      companyId,
    }
    localStorage.setItem('letus-mock-user', JSON.stringify(mockUser))
    localStorage.setItem('letus-user', JSON.stringify(mockUser))
    setUser(mockUser)
    if (companyId && company) setSelectedCompany(company)
  }

  const isAdmin = user?.role === 'admin'
  const canEdit = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, canEdit, signIn, signOut, mockLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
