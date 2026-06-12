'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const ADMIN_ONLY = ['/salary', '/personal-unpaid']

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!isAdmin && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
      router.replace('/dashboard')
    }
  }, [user, loading, isAdmin, pathname, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-slate-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  if (!user) return null

  if (!isAdmin && ADMIN_ONLY.some((p) => pathname.startsWith(p))) return null

  return <>{children}</>
}
