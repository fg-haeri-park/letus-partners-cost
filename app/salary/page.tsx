'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload } from '@/components/upload/file-upload'
import { MOCK_SALARIES, IS_MOCK } from '@/lib/mock-data'
import { formatKRW } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

type Salary = {
  id: string
  employee_name: string
  job_type: string
  ym: string
  base_pay: number
  allowance: number
  deduction: number
  net_pay: number
  centers?: { name: string } | null
}

export default function SalaryPage() {
  const { selectedCompany, selectedYm } = useAppStore()
  const { canEdit } = useAuth()
  const [rows, setRows] = useState<Salary[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>('전체')

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return
    setLoading(true)
    if (IS_MOCK) { setRows(MOCK_SALARIES as Salary[]); setLoading(false); return }
    const { data } = await supabase
      .from('salaries')
      .select('*, centers(name)')
      .eq('company_id', selectedCompany.id)
      .eq('ym', selectedYm)
      .order('job_type')
    setRows(data ?? [])
    setLoading(false)
  }, [selectedCompany, selectedYm])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleUpload(file: File) {
    if (!selectedCompany) { toast.error('법인을 먼저 선택하세요'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('company_id', selectedCompany.id)
    formData.append('ym', selectedYm)
    try {
      const res = await fetch('/api/upload/salary', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success(`${json.count}건 업로드 완료`)
      setUploadOpen(false)
      fetchData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  const filtered = filterType === '전체' ? rows : rows.filter((r) => r.job_type === filterType)
  const jobTypes = ['전체', ...Array.from(new Set(rows.map((r) => r.job_type)))]

  const totalNetPay = filtered.reduce((s, r) => s + Number(r.net_pay), 0)
  const totalBasePay = filtered.reduce((s, r) => s + Number(r.base_pay), 0)
  const totalDeduction = filtered.reduce((s, r) => s + Number(r.deduction), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">직원급여</h2>
          <p className="text-sm text-slate-500 mt-0.5">{selectedCompany?.name} · {selectedYm}</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          {canEdit && <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload size={14} className="mr-1.5" />급여 업로드</Button>}
          <DialogContent>
            <DialogHeader><DialogTitle>급여 업로드</DialogTitle></DialogHeader>
            <p className="text-xs text-slate-500 mb-3">
              필수 컬럼: 성명, 직군(사무/현장/지원), 기본급, 수당, 공제액, 실수령액
            </p>
            <FileUpload onFile={handleUpload} loading={uploading} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '기본급 합계', value: totalBasePay },
          { label: '공제 합계', value: totalDeduction, color: 'text-red-600' },
          { label: '실수령 합계', value: totalNetPay, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-xl font-bold ${color ?? 'text-slate-900'}`}>{formatKRW(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">급여 내역</CardTitle>
            <div className="flex gap-1">
              {jobTypes.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={filterType === t ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => setFilterType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>성명</TableHead>
                <TableHead>직군</TableHead>
                <TableHead className="text-right">기본급</TableHead>
                <TableHead className="text-right">수당</TableHead>
                <TableHead className="text-right">공제</TableHead>
                <TableHead className="text-right">실수령</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">불러오는 중...</TableCell></TableRow>}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">데이터 없음</TableCell></TableRow>}
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.employee_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{row.job_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatKRW(Number(row.base_pay))}</TableCell>
                  <TableCell className="text-right text-blue-600">{formatKRW(Number(row.allowance))}</TableCell>
                  <TableCell className="text-right text-red-600">{formatKRW(Number(row.deduction))}</TableCell>
                  <TableCell className="text-right font-semibold">{formatKRW(Number(row.net_pay))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
