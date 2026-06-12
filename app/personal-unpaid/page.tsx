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
import { MOCK_PERSONAL_UNPAID, IS_MOCK } from '@/lib/mock-data'
import { formatKRW } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

type PersonalUnpaid = {
  id: string
  employee_name: string
  date: string
  item: string
  amount: number
  note: string | null
  is_paid: boolean
}

export default function PersonalUnpaidPage() {
  const { selectedCompany } = useAppStore()
  const { canEdit } = useAuth()
  const [rows, setRows] = useState<PersonalUnpaid[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [showPaid, setShowPaid] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return
    setLoading(true)
    if (IS_MOCK) {
      setRows((showPaid ? MOCK_PERSONAL_UNPAID : MOCK_PERSONAL_UNPAID.filter((r) => !r.is_paid)) as PersonalUnpaid[])
      setLoading(false)
      return
    }
    const query = supabase
      .from('personal_unpaid')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('date', { ascending: false })
    if (!showPaid) query.eq('is_paid', false)
    const { data } = await query
    setRows(data ?? [])
    setLoading(false)
  }, [selectedCompany, showPaid])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleUpload(file: File) {
    if (!selectedCompany) { toast.error('법인을 먼저 선택하세요'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('company_id', selectedCompany.id)
    try {
      const res = await fetch('/api/upload/personal-unpaid', { method: 'POST', body: formData })
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

  async function togglePaid(id: string, current: boolean) {
    await supabase.from('personal_unpaid').update({ is_paid: !current }).eq('id', id)
    fetchData()
  }

  const totalUnpaid = rows.filter((r) => !r.is_paid).reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">개인미지급금</h2>
          <p className="text-sm text-slate-500 mt-0.5">{selectedCompany?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showPaid ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPaid(!showPaid)}
          >
            {showPaid ? '전체 보기' : '지급 완료 포함'}
          </Button>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            {canEdit && <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload size={14} className="mr-1.5" />업로드</Button>}
            <DialogContent>
              <DialogHeader><DialogTitle>개인미지급금 업로드</DialogTitle></DialogHeader>
              <p className="text-xs text-slate-500 mb-3">필수 컬럼: 성명, 항목, 금액, 일자, 비고</p>
              <FileUpload onFile={handleUpload} loading={uploading} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-8">
          <div>
            <p className="text-xs text-slate-500">미지급 합계</p>
            <p className="text-xl font-bold text-red-600">{formatKRW(totalUnpaid)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">미지급 건수</p>
            <p className="text-xl font-bold">{rows.filter((r) => !r.is_paid).length}건</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>일자</TableHead>
                <TableHead>성명</TableHead>
                <TableHead>항목</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="w-24">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">불러오는 중...</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">데이터 없음</TableCell></TableRow>}
              {rows.map((row) => (
                <TableRow key={row.id} className={row.is_paid ? 'opacity-50' : ''}>
                  <TableCell className="text-xs">{row.date}</TableCell>
                  <TableCell className="font-medium">{row.employee_name}</TableCell>
                  <TableCell className="text-sm">{row.item}</TableCell>
                  <TableCell className="text-right font-medium">{formatKRW(Number(row.amount))}</TableCell>
                  <TableCell className="text-xs text-slate-500">{row.note}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => togglePaid(row.id, row.is_paid)}
                      className={`text-xs px-2 py-1 rounded border ${row.is_paid ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-600 border-red-200'}`}
                    >
                      {row.is_paid ? '지급완료' : '미지급'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
