'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { MOCK_COMPANIES, MOCK_CENTERS, IS_MOCK } from '@/lib/mock-data'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronRight, Lock } from 'lucide-react'

export function Header() {
  const {
    companies, centers, selectedCompany, selectedCenter, selectedYm,
    setCompanies, setCenters, setSelectedCompany, setSelectedCenter, setSelectedYm,
  } = useAppStore()
  const { user } = useAuth()

  // 법인 제한 여부: companyId가 있으면 해당 법인만 고정
  const isCompanyLocked = !!user?.companyId

  useEffect(() => {
    if (IS_MOCK) {
      setCompanies(MOCK_COMPANIES)
      return
    }
    supabase.from('companies').select('*').order('name').then(({ data }) => {
      if (data) setCompanies(data)
    })
  }, [setCompanies])

  // 법인 제한 사용자: companies 로드 후 해당 법인 자동 선택
  useEffect(() => {
    if (!user?.companyId || companies.length === 0) return
    if (selectedCompany?.id === user.companyId) return
    const locked = companies.find((c) => c.id === user.companyId)
    if (locked) setSelectedCompany(locked)
  }, [user?.companyId, companies, selectedCompany, setSelectedCompany])

  useEffect(() => {
    if (!selectedCompany) { setCenters([]); return }
    if (IS_MOCK) {
      setCenters(MOCK_CENTERS.filter((c) => c.company_id === selectedCompany.id))
      return
    }
    supabase.from('centers').select('*').eq('company_id', selectedCompany.id).order('name').then(({ data }) => {
      if (data) setCenters(data)
    })
  }, [selectedCompany, setCenters])

  const ymOptions = () => {
    const opts = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      opts.push({ value: val, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` })
    }
    return opts.reverse()
  }

  return (
    <header className="h-14 border-b bg-white flex items-center px-6 gap-3 shrink-0">
      <div className="flex items-center gap-2 flex-1">
        {isCompanyLocked ? (
          // 법인 제한 사용자: 고정 텍스트 (변경 불가)
          <div className="flex items-center gap-1.5 px-3 h-8 border rounded-md bg-slate-50 text-sm text-slate-700 w-44">
            <Lock size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{selectedCompany?.name ?? '법인 지정됨'}</span>
          </div>
        ) : (
          <Select
            value={selectedCompany?.id ?? ''}
            onValueChange={(v) => {
              const c = companies.find((c) => c.id === v) ?? null
              setSelectedCompany(c)
            }}
          >
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="법인 선택">
                {selectedCompany?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {centers.length > 0 && (
          <>
            <ChevronRight size={14} className="text-slate-400" />
            <Select
              value={selectedCenter?.id ?? 'all'}
              onValueChange={(v) => {
                const c = centers.find((c) => c.id === v) ?? null
                setSelectedCenter(c)
              }}
            >
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="전체 센터">
                  {selectedCenter?.name ?? '전체 센터'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 센터</SelectItem>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      <Select value={selectedYm} onValueChange={(v) => v && setSelectedYm(v)}>
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue>
            {ymOptions().find((o) => o.value === selectedYm)?.label ?? selectedYm}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ymOptions().map(({ value, label }) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  )
}
