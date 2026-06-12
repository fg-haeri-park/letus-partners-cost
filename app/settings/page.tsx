'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MOCK_ACCOUNTS, MOCK_COMPANIES, MOCK_CENTERS, IS_MOCK } from '@/lib/mock-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Account = {
  id: string
  category: string
  sub_category: string
  name: string
  sort_order: number
  company_id: string | null
}

type Company = { id: string; name: string; code: string }
type Center = { id: string; company_id: string; name: string; type: string }

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [newAccount, setNewAccount] = useState({ category: '고정비', sub_category: '기타', name: '' })

  useEffect(() => {
    if (IS_MOCK) {
      setAccounts(MOCK_ACCOUNTS as Account[])
      setCompanies(MOCK_COMPANIES)
      setCenters(MOCK_CENTERS)
      return
    }
    supabase.from('accounts').select('*').order('sort_order').then(({ data }) => { if (data) setAccounts(data) })
    supabase.from('companies').select('*').order('name').then(({ data }) => { if (data) setCompanies(data) })
    supabase.from('centers').select('*').order('name').then(({ data }) => { if (data) setCenters(data) })
  }, [])

  async function addAccount() {
    if (!newAccount.name.trim()) { toast.error('계정과목명을 입력하세요'); return }
    const maxOrder = Math.max(...accounts.map((a) => a.sort_order), 0)
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...newAccount, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    setAccounts((prev) => [...prev, data])
    setNewAccount({ category: '고정비', sub_category: '기타', name: '' })
    toast.success('계정과목 추가 완료')
  }

  async function deleteAccount(id: string) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    toast.success('삭제 완료')
  }

  const catColors: Record<string, string> = {
    매출: 'bg-blue-100 text-blue-700',
    변동비: 'bg-orange-100 text-orange-700',
    고정비: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">설정</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 계정과목 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">계정과목 관리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <select
                className="border rounded px-2 py-1.5 text-sm"
                value={newAccount.category}
                onChange={(e) => setNewAccount((p) => ({ ...p, category: e.target.value }))}
              >
                <option>매출</option>
                <option>변동비</option>
                <option>고정비</option>
              </select>
              <Input
                placeholder="중분류"
                value={newAccount.sub_category}
                onChange={(e) => setNewAccount((p) => ({ ...p, sub_category: e.target.value }))}
                className="h-8 w-24 text-sm"
              />
              <Input
                placeholder="계정과목명"
                value={newAccount.name}
                onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
                className="h-8 flex-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addAccount()}
              />
              <Button size="sm" onClick={addAccount} className="h-8">
                <Plus size={14} />
              </Button>
            </div>

            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>구분</TableHead>
                    <TableHead>중분류</TableHead>
                    <TableHead>계정과목</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${catColors[a.category]}`}>
                          {a.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{a.sub_category}</TableCell>
                      <TableCell className="text-sm">{a.name}</TableCell>
                      <TableCell>
                        <button onClick={() => deleteAccount(a.id)} className="text-slate-300 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 업체/센터 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">업체 · 센터 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {companies.map((company) => (
                <div key={company.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{company.name}</span>
                    <Badge variant="outline" className="text-xs">{company.code}</Badge>
                  </div>
                  <div className="pl-4 space-y-1">
                    {centers.filter((c) => c.company_id === company.id).map((center) => (
                      <div key={center.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {center.name}
                        <span className="text-xs text-slate-400">({center.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">업체·센터 추가는 DB migration으로 관리합니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
