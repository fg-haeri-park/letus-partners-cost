'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload } from '@/components/upload/file-upload'
import { MOCK_ACCOUNTS, MOCK_MONTHLY_SUMMARY, MOCK_WORK_HOURS, IS_MOCK } from '@/lib/mock-data'
import { formatKRW } from '@/lib/utils'
import { Download, RefreshCw, Clock, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

type Account = {
  id: string
  category: string
  sub_category: string
  name: string
  sort_order: number
}

type Summary = Record<string, number>

type WorkHours = {
  total_hours: number
  weighted_hours: number
  headcount?: number
} | null

export default function PLStatementPage() {
  const { selectedCompany, selectedCenter, selectedYm } = useAppStore()
  const { canEdit } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [summary, setSummary] = useState<Summary>({})
  const [workHours, setWorkHours] = useState<WorkHours>(null)
  const [loading, setLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [hoursUploadOpen, setHoursUploadOpen] = useState(false)
  const [hoursUploading, setHoursUploading] = useState(false)
  const [hoursYear, setHoursYear] = useState(String(new Date().getFullYear()))

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return
    setLoading(true)

    if (IS_MOCK) {
      setAccounts(MOCK_ACCOUNTS as Account[])
      setSummary(MOCK_MONTHLY_SUMMARY[selectedCompany.id] ?? {})
      setWorkHours(MOCK_WORK_HOURS[selectedCompany.id]?.[selectedYm] ?? null)
      setLoading(false)
      return
    }

    const [{ data: accs }, { data: rows }, { data: wh }] = await Promise.all([
      supabase.from('accounts').select('*').order('sort_order'),
      (() => {
        const q = supabase.from('monthly_summary').select('account_id, amount')
          .eq('company_id', selectedCompany.id).eq('ym', selectedYm)
        if (selectedCenter) q.eq('center_id', selectedCenter.id)
        return q
      })(),
      supabase.from('monthly_work_hours').select('total_hours, weighted_hours, headcount')
        .eq('company_id', selectedCompany.id).eq('ym', selectedYm).single(),
    ])

    setAccounts(accs ?? [])
    const map: Summary = {}
    for (const r of rows ?? []) map[r.account_id] = (map[r.account_id] ?? 0) + Number(r.amount)
    setSummary(map)
    setWorkHours(wh ?? null)
    setLoading(false)
  }, [selectedCompany, selectedCenter, selectedYm])

  useEffect(() => { fetchData() }, [fetchData])

  async function recalculate() {
    if (!selectedCompany) { toast.error('법인을 선택하세요'); return }
    setRecalculating(true)
    try {
      const res = await fetch('/api/summary/recalculate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id, ym: selectedYm }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success('재계산 완료')
      fetchData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setRecalculating(false)
    }
  }

  async function handleHoursUpload(file: File) {
    setHoursUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('year', hoursYear)
      const res = await fetch('/api/upload/work-hours', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success(`${json.count}개월 근무시간 업로드 완료 (${json.months?.join(', ')})`)
      setHoursUploadOpen(false)
      fetchData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setHoursUploading(false)
    }
  }

  async function handleExcel() {
    if (!selectedCompany) return
    const params = new URLSearchParams({
      type: 'pl', company_id: selectedCompany.id, ym: selectedYm,
      ...(selectedCenter ? { center_id: selectedCenter.id } : {}),
    })
    const res = await fetch(`/api/export/excel?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `채산표_${selectedCompany.name}_${selectedYm}.xlsx`; a.click()
  }

  const revenue = accounts.filter((a) => a.category === '매출').reduce((s, a) => s + (summary[a.id] ?? 0), 0)
  const variableCost = accounts.filter((a) => a.category === '변동비').reduce((s, a) => s + (summary[a.id] ?? 0), 0)
  const fixedCost = accounts.filter((a) => a.category === '고정비').reduce((s, a) => s + (summary[a.id] ?? 0), 0)
  const contribution = revenue - variableCost
  const operatingIncome = contribution - fixedCost

  // 채산이익 = 영업이익 (동일 개념, 근무시간 대비 효율 계산용)
  const chaesanProfit = operatingIncome
  const weightedHours = workHours?.weighted_hours ?? 0
  const hourlyChaesan = weightedHours > 0 ? chaesanProfit / weightedHours : null

  const categories: { key: string; label: string; accounts: Account[] }[] = [
    { key: '매출', label: '① 용역수입', accounts: accounts.filter((a) => a.category === '매출') },
    { key: '변동비', label: '② 변동비', accounts: accounts.filter((a) => a.category === '변동비') },
    { key: '고정비', label: '④ 고정비', accounts: accounts.filter((a) => a.category === '고정비') },
  ]

  const [y, m] = selectedYm?.split('-') ?? ['', '']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">손익계산서 (채산표)</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedCompany?.name}{selectedCenter ? ` · ${selectedCenter.name}` : ' · 전체'}
            {selectedYm ? ` · ${y}년 ${Number(m)}월` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Dialog open={hoursUploadOpen} onOpenChange={setHoursUploadOpen}>
                <Button variant="outline" size="sm" onClick={() => setHoursUploadOpen(true)}>
                  <Clock size={14} className="mr-1.5" />근무시간 업로드
                </Button>
                <DialogContent>
                  <DialogHeader><DialogTitle>근태 파일 업로드</DialogTitle></DialogHeader>
                  <p className="text-xs text-slate-500 mb-2">
                    ★20XX 사내협력사 근태.xlsx 파일을 업로드하면<br />
                    모든 법인의 월별 근무시간이 자동 집계됩니다.
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-sm text-slate-600 shrink-0">연도</label>
                    <input
                      type="number"
                      value={hoursYear}
                      onChange={(e) => setHoursYear(e.target.value)}
                      className="border rounded px-2 py-1 text-sm w-24"
                      min={2020} max={2099}
                    />
                  </div>
                  <FileUpload onFile={handleHoursUpload} loading={hoursUploading}
                    accept=".xlsx,.xls" label="근태 파일 선택 (xlsx)" />
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={recalculate} disabled={recalculating}>
                <RefreshCw size={14} className={`mr-1.5 ${recalculating ? 'animate-spin' : ''}`} />
                재계산
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExcel}>
            <Download size={14} className="mr-1.5" />Excel
          </Button>
        </div>
      </div>

      {!selectedCompany && (
        <Card><CardContent className="py-12 text-center text-slate-400">법인을 선택하세요.</CardContent></Card>
      )}

      {selectedCompany && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead className="w-20">구분</TableHead>
                  <TableHead>계정과목</TableHead>
                  <TableHead className="text-right w-40">금액</TableHead>
                  <TableHead className="text-right w-32 text-slate-400">비율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">불러오는 중...</TableCell></TableRow>
                ) : (
                  <>
                    {categories.map(({ key, label, accounts: accs }) => (
                      <React.Fragment key={key}>
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan={4} className="font-semibold text-slate-700 py-2">{label}</TableCell>
                        </TableRow>
                        {accs.map((acc) => (
                          <TableRow key={acc.id} className="hover:bg-slate-50">
                            <TableCell className="text-xs text-slate-400 pl-6">{acc.sub_category}</TableCell>
                            <TableCell className="text-sm pl-6">{acc.name}</TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatKRW(summary[acc.id] ?? 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-400">
                              {revenue > 0 ? `${((summary[acc.id] ?? 0) / revenue * 100).toFixed(1)}%` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {key === '변동비' && (
                          <TableRow className="bg-blue-50 font-semibold">
                            <TableCell colSpan={2} className="pl-6">③ 공헌이익 (①-②)</TableCell>
                            <TableCell className={`text-right ${contribution >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              {formatKRW(contribution)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-500">
                              {revenue > 0 ? `${(contribution / revenue * 100).toFixed(1)}%` : '-'}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}

                    {/* ⑤ 영업이익 */}
                    <TableRow className="bg-emerald-50 font-bold text-base">
                      <TableCell colSpan={2} className="pl-6">⑤ 영업이익 (③-④)</TableCell>
                      <TableCell className={`text-right text-lg ${operatingIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatKRW(operatingIncome)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-500">
                        {revenue > 0 ? `${(operatingIncome / revenue * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                    </TableRow>

                    {/* 근무시간 구분선 */}
                    <TableRow className="bg-slate-100">
                      <TableCell colSpan={4} className="py-1.5 font-semibold text-slate-600 text-sm flex items-center gap-1.5">
                        <Clock size={13} className="inline-block text-slate-400" />
                        근무시간
                        {!workHours && canEdit && (
                          <button
                            onClick={() => setHoursUploadOpen(true)}
                            className="ml-2 text-xs text-blue-500 hover:text-blue-700 font-normal underline"
                          >
                            근태 파일 업로드
                          </button>
                        )}
                      </TableCell>
                    </TableRow>

                    {workHours ? (
                      <>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="text-xs text-slate-400 pl-6">근무시간</TableCell>
                          <TableCell className="text-sm pl-6">기존합계 (실근무)</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {workHours.total_hours.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}시간
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-400">
                            {workHours.headcount ? `${workHours.headcount}명` : ''}
                          </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="text-xs text-slate-400 pl-6">근무시간</TableCell>
                          <TableCell className="text-sm pl-6">가산합계 (시간당 채산 기준)</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {workHours.weighted_hours.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}시간
                          </TableCell>
                          <TableCell />
                        </TableRow>

                        {/* ⑥ 채산이익 */}
                        <TableRow className="bg-violet-50 font-bold">
                          <TableCell colSpan={2} className="pl-6 text-violet-800">⑥ 채산이익</TableCell>
                          <TableCell className={`text-right text-lg font-bold ${chaesanProfit >= 0 ? 'text-violet-700' : 'text-red-600'}`}>
                            {formatKRW(chaesanProfit)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-500">
                            {revenue > 0 ? `${(chaesanProfit / revenue * 100).toFixed(1)}%` : '-'}
                          </TableCell>
                        </TableRow>

                        {/* 시간당 채산이익 */}
                        <TableRow className="bg-violet-50">
                          <TableCell colSpan={2} className="pl-6 text-sm text-violet-700 font-semibold">
                            시간당 채산이익
                            <span className="text-xs font-normal text-slate-400 ml-1">(채산이익 ÷ 가산합계)</span>
                          </TableCell>
                          <TableCell className={`text-right font-bold text-base ${(hourlyChaesan ?? 0) >= 0 ? 'text-violet-700' : 'text-red-600'}`}>
                            {hourlyChaesan !== null
                              ? `${Math.round(hourlyChaesan).toLocaleString('ko-KR')}원/h`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-400">
                            {workHours.weighted_hours > 0
                              ? `${workHours.weighted_hours.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}h 기준`
                              : ''}
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-slate-400 text-sm">
                          {canEdit
                            ? '근태 파일을 업로드하면 채산이익과 시간당 채산이익이 계산됩니다.'
                            : '근무시간 데이터 없음'}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
