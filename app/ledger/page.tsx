'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MOCK_ACCOUNTS, MOCK_MONTHLY_SUMMARY, IS_MOCK } from '@/lib/mock-data'
import { formatKRW } from '@/lib/utils'

type AccountRow = {
  id: string
  category: string
  sub_category: string
  name: string
  sort_order: number
  amount: number
}

export default function LedgerPage() {
  const { selectedCompany, selectedYm } = useAppStore()
  const [rows, setRows] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return
    setLoading(true)
    if (IS_MOCK) {
      const amounts = MOCK_MONTHLY_SUMMARY[selectedCompany.id] ?? {}
      setRows(MOCK_ACCOUNTS.map((a) => ({ ...a, amount: amounts[a.id] ?? 0 })) as AccountRow[])
      setLoading(false)
      return
    }
    const { data: accounts } = await supabase.from('accounts').select('*').order('sort_order')
    const { data: summaryRows } = await supabase
      .from('monthly_summary')
      .select('account_id, amount')
      .eq('company_id', selectedCompany.id)
      .eq('ym', selectedYm)

    const amountMap: Record<string, number> = {}
    for (const r of summaryRows ?? []) {
      amountMap[r.account_id] = (amountMap[r.account_id] ?? 0) + Number(r.amount)
    }

    setRows((accounts ?? []).map((a) => ({ ...a, amount: amountMap[a.id] ?? 0 })))
    setLoading(false)
  }, [selectedCompany, selectedYm])

  useEffect(() => { fetchData() }, [fetchData])

  const grouped: Record<string, AccountRow[]> = {}
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = []
    grouped[row.category].push(row)
  }

  const revenue = rows.filter((r) => r.category === '매출').reduce((s, r) => s + r.amount, 0)
  const variableCost = rows.filter((r) => r.category === '변동비').reduce((s, r) => s + r.amount, 0)
  const fixedCost = rows.filter((r) => r.category === '고정비').reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">계정별원장</h2>
        <p className="text-sm text-slate-500 mt-0.5">{selectedCompany?.name} · {selectedYm}</p>
      </div>

      {!selectedCompany && (
        <Card><CardContent className="py-12 text-center text-slate-400">법인을 선택하세요.</CardContent></Card>
      )}

      {selectedCompany && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-20">대분류</TableHead>
                  <TableHead className="w-28">중분류</TableHead>
                  <TableHead>계정과목</TableHead>
                  <TableHead className="text-right w-40">금액</TableHead>
                  <TableHead className="text-right w-32">비율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">불러오는 중...</TableCell></TableRow>
                )}
                {!loading && Object.entries(grouped).map(([cat, catRows]) => {
                  const catTotal = catRows.reduce((s, r) => s + r.amount, 0)
                  return (
                    <React.Fragment key={cat}>
                      {catRows.map((row, i) => (
                        <TableRow key={row.id} className="hover:bg-slate-50">
                          {i === 0 && (
                            <TableCell rowSpan={catRows.length} className="font-semibold text-slate-700 bg-slate-50 border-r align-top pt-4">
                              {cat}
                            </TableCell>
                          )}
                          <TableCell className="text-xs text-slate-500">{row.sub_category}</TableCell>
                          <TableCell className="text-sm">{row.name}</TableCell>
                          <TableCell className="text-right font-medium">{formatKRW(row.amount)}</TableCell>
                          <TableCell className="text-right text-xs text-slate-400">
                            {revenue > 0 ? `${(row.amount / revenue * 100).toFixed(1)}%` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100 font-semibold">
                        <TableCell />
                        <TableCell colSpan={2}>{cat} 합계</TableCell>
                        <TableCell className="text-right">{formatKRW(catTotal)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {revenue > 0 ? `${(catTotal / revenue * 100).toFixed(1)}%` : '-'}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                })}
                {!loading && rows.length > 0 && (
                  <TableRow className="bg-emerald-50 font-bold">
                    <TableCell colSpan={3}>영업이익</TableCell>
                    <TableCell className={`text-right text-lg ${(revenue - variableCost - fixedCost) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatKRW(revenue - variableCost - fixedCost)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {revenue > 0 ? `${((revenue - variableCost - fixedCost) / revenue * 100).toFixed(1)}%` : '-'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
