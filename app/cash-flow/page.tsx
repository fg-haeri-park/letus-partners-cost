'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MOCK_CASH_FLOW, IS_MOCK } from '@/lib/mock-data'
import { formatKRW } from '@/lib/utils'
import { Download, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

type CashFlowRow = {
  id: string
  category: string
  label: string
  amount: number
  sort_order: number
}

export default function CashFlowPage() {
  const { selectedCompany, selectedYm } = useAppStore()
  const { canEdit } = useAuth()
  const [rows, setRows] = useState<CashFlowRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMap, setEditMap] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return
    setLoading(true)
    if (IS_MOCK) {
      setRows(MOCK_CASH_FLOW as CashFlowRow[])
      setEditMap({})
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('cash_flow_daily')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .eq('ym', selectedYm)
      .order('sort_order')
    setRows(data ?? [])
    setEditMap({})
    setLoading(false)
  }, [selectedCompany, selectedYm])

  useEffect(() => { fetchData() }, [fetchData])

  async function autoGenerate() {
    if (!selectedCompany) { toast.error('법인을 선택하세요'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/summary/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id, ym: selectedYm }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success('자금일보 자동 생성 완료')
      fetchData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setSaving(false)
    }
  }

  async function saveEdits() {
    setSaving(true)
    try {
      const updates = Object.entries(editMap).map(([id, amount]) =>
        supabase.from('cash_flow_daily').update({ amount }).eq('id', id)
      )
      await Promise.all(updates)
      toast.success('저장 완료')
      fetchData()
    } catch {
      toast.error('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  function getAmount(row: CashFlowRow) {
    return editMap[row.id] !== undefined ? editMap[row.id] : Number(row.amount)
  }

  const carryover = rows.filter((r) => r.category === '이월').reduce((s, r) => s + getAmount(r), 0)
  const totalIn = rows.filter((r) => r.category === '입금').reduce((s, r) => s + getAmount(r), 0)
  const totalOut = rows.filter((r) => r.category === '출금').reduce((s, r) => s + getAmount(r), 0)
  const balance = carryover + totalIn - totalOut

  const [y, m] = selectedYm?.split('-') ?? ['', '']

  const categoryLabel: Record<string, string> = { 이월: '이월금액', 입금: '입금 항목', 출금: '출금 항목' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">자금일보</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedCompany?.name} · {y}년 {Number(m)}월
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={autoGenerate} disabled={saving}>
              <RefreshCw size={14} className={`mr-1.5 ${saving ? 'animate-spin' : ''}`} />
              자동 생성
            </Button>
          )}
          {canEdit && Object.keys(editMap).length > 0 && (
            <Button size="sm" onClick={saveEdits} disabled={saving}>
              <Save size={14} className="mr-1.5" />저장
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download size={14} className="mr-1.5" />Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '이월금액', value: carryover, color: 'text-slate-700' },
          { label: '입금 합계', value: totalIn, color: 'text-blue-600' },
          { label: '출금 합계', value: totalOut, color: 'text-red-600' },
          { label: '잔액', value: balance, color: balance >= 0 ? 'text-emerald-600' : 'text-red-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{formatKRW(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!selectedCompany && (
        <Card><CardContent className="py-12 text-center text-slate-400">법인을 선택하세요.</CardContent></Card>
      )}

      {selectedCompany && rows.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 mb-3">자금일보 데이터가 없습니다.</p>
            <Button onClick={autoGenerate} disabled={saving}>
              <RefreshCw size={14} className="mr-1.5" />통장·급여 데이터로 자동 생성
            </Button>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-24">구분</TableHead>
                  <TableHead>항목</TableHead>
                  <TableHead className="text-right w-48">금액 (원)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(['이월', '입금', '출금'] as const).map((cat) => {
                  const catRows = rows.filter((r) => r.category === cat)
                  if (catRows.length === 0) return null
                  const catTotal = catRows.reduce((s, r) => s + getAmount(r), 0)
                  return (
                    <>
                      <TableRow key={`cat-${cat}`} className="bg-slate-100">
                        <TableCell colSpan={2} className="font-semibold text-slate-700 py-2">
                          {categoryLabel[cat]}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${cat === '출금' ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatKRW(catTotal)}
                        </TableCell>
                      </TableRow>
                      {catRows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-slate-50">
                          <TableCell />
                          <TableCell className="text-sm pl-6">{row.label}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="h-7 text-right text-sm w-40 ml-auto"
                              value={getAmount(row)}
                              onChange={(e) =>
                                setEditMap((prev) => ({ ...prev, [row.id]: Number(e.target.value) }))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )
                })}
                <TableRow className="bg-emerald-50 font-bold">
                  <TableCell colSpan={2} className="font-bold">잔액 (이월+입금-출금)</TableCell>
                  <TableCell className={`text-right text-lg ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatKRW(balance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
