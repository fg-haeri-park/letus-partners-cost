'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IS_MOCK, MOCK_COMPANIES } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Lock, Mail, ChevronDown } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { mockLogin, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  // mock 전용: 일반 사용자 법인 선택
  const [memberCompany, setMemberCompany] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      toast.error(error)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  function handleMockLogin(role: 'admin' | 'member') {
    mockLogin(role, role === 'member' ? memberCompany : null)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">LETUS 재무관리</h1>
          <p className="text-slate-400 text-sm mt-1">협력사 통합 관리 시스템</p>
        </div>

        <Card className="border-slate-700 bg-slate-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-base">로그인</CardTitle>
          </CardHeader>
          <CardContent>
            {IS_MOCK ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 text-center pb-1">미리보기 모드 — 역할을 선택하여 입장하세요</p>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleMockLogin('admin')}
                >
                  관리자로 입장 (전체 법인)
                </Button>

                <div className="border border-slate-600 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-slate-300 font-medium">일반 사용자로 입장</p>
                  <div className="relative">
                    <select
                      value={memberCompany ?? ''}
                      onChange={(e) => setMemberCompany(e.target.value || null)}
                      className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded px-3 py-2 appearance-none pr-8"
                    >
                      <option value="">전체 법인 접근</option>
                      {MOCK_COMPANIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} 직원</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-200 hover:bg-slate-700"
                    onClick={() => handleMockLogin('member')}
                  >
                    {memberCompany
                      ? `${MOCK_COMPANIES.find((c) => c.id === memberCompany)?.name} 직원으로 입장`
                      : '일반 사용자로 입장'}
                  </Button>
                </div>

                <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                  <p>관리자: 전체 법인 + 민감 정보 + 수정 권한</p>
                  <p>일반 사용자: 지정 법인 조회만 (민감 정보 제외)</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">이메일</Label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">비밀번호</Label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          계정이 없으신가요? 관리자에게 초대를 요청하세요.
        </p>
      </div>
    </div>
  )
}
