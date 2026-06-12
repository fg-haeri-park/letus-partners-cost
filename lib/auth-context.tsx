'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { IS_MOCK, MOCK_COMPANIES } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

export type UserRole = 'admin' | 'member'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
  companyId: string | null  // null = 전체 법인 접근, 값 있으면 해당 법인만
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  canEdit: boolean
  signOut: () => Promise<void>
  mockLogin: (role: UserRole, companyId?: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  canEdit: false,
  signOut: async () => {},
  mockLogin: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { setSelectedCompany, setCompanies, companies } = useAppStore()

  // 법인 제한이 있는 사용자: 해당 법인 자동 선택
  function applyCompanyRestriction(companyId: string | null) {
    if (!companyId) return
    if (IS_MOCK) {
      const company = MOCK_COMPANIES.find((c) => c.id === companyId)
      if (company) setSelectedCompany(company)
    } else {
      // Supabase 모드: companies가 로드된 후 적용 (header에서 처리)
    }
  }

  useEffect(() => {
    if (IS_MOCK) {
      const saved = localStorage.getItem('letus-mock-user')
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as AuthUser
          setUser(parsed)
          applyCompanyRestriction(parsed.companyId)
        } catch {}
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email ?? '')
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email ?? '')
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string, email: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('name, role, company_id, companies(id, name, code)')
      .eq('user_id', userId)
      .single()

    const companyId = data?.company_id ?? null
    const authUser: AuthUser = {
      id: userId,
      email,
      name: data?.name ?? email.split('@')[0],
      role: (data?.role as UserRole) ?? 'member',
      companyId,
    }
    setUser(authUser)

    // 법인 제한 사용자: 해당 법인 자동 선택
    if (companyId && data?.companies) {
      const co = data.companies as { id: string; name: string; code: string }
      setSelectedCompany(co)
    }
  }

  async function signOut() {
    if (IS_MOCK) {
      localStorage.removeItem('letus-mock-user')
      setUser(null)
      return
    }
    await supabase.auth.signOut()
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
    setUser(mockUser)
    if (companyId && company) setSelectedCompany(company)
  }

  const isAdmin = user?.role === 'admin'
  const canEdit = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, canEdit, signOut, mockLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
