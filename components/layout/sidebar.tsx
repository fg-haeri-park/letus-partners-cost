'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Building2,
  FileText,
  CreditCard,
  Users,
  DollarSign,
  BookOpen,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/pl-statement', label: '손익계산서(채산표)', icon: TrendingUp },
  { href: '/cash-flow', label: '자금일보', icon: Wallet },
  { href: '/bank', label: '통장내역', icon: Building2 },
  { href: '/invoice', label: '세금계산서', icon: FileText },
  { href: '/card', label: '카드매입', icon: CreditCard },
  { href: '/personal-unpaid', label: '개인미지급금', icon: Users, adminOnly: true },
  { href: '/salary', label: '직원급여', icon: DollarSign, adminOnly: true },
  { href: '/ledger', label: '계정별원장', icon: BookOpen },
  { href: '/settings', label: '설정', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">LETUS 재무관리</h1>
        <p className="text-xs text-slate-400 mt-0.5">협력사 통합 관리 시스템</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ href, label, icon: Icon, adminOnly }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-blue-600 text-white font-medium'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {adminOnly && (
              <ShieldCheck size={12} className="text-amber-400 opacity-70" />
            )}
          </Link>
        ))}
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="px-4 py-3 border-t border-slate-700">
        {user && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium text-white shrink-0">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {isAdmin ? '관리자' : '일반 사용자'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="로그아웃"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
        <p className="text-xs text-slate-600">v1.0 · LETUS</p>
      </div>
    </aside>
  )
}
