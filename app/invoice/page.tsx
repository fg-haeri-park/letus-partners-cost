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
import { MOCK_INVOICES, IS_MOCK } from '@/lib/mock-data'
import { formatKRW } from '@/lib/utils'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

type Invoice = {
  id: string
  direction: string
  issue_date: string
  supplier: string
  amount: number
  tax: number
  item: string | null
}

export default function InvoicePage() {
  const { selectedCompany, selectedYm } = useAppStore()
  const { canEdit } = useAuth()
  const [rows, setRows] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [direction, setDirection] = useState<'매출' | '매입'>('매출')
  const [uploadOpen, setUploadOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return
    setLoading(true)
    if (IS_MOCK) { setRows(MOCK_INVOICES as Invoice[]); setLoading(false); return }
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .gte('issue_date', `${selectedYm}-01`)
      .lte('issue_date', `${selectedYm}-31`)
      .order('issue_date')
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
    formData.append('direction', direction)
    try {
      const res = await fetch('/api/upload/invoice', { method: 'POST', body: formData })
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

  const sales = rows.filter((r) => r.direction === '매출')
  const purchases = rows.filter((r) => r.direction === '매입')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">세금계산서</h2>
          <p className="text-sm text-slate-500 mt-0.5">{selectedCompany?.name} · {selectedYm}</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          {canEdit && <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload size={14} className="mr-1.5" />홈택스 업로드</Button>}
          <DialogContent>
            <DialogHeader><DialogTitle>세금계산서 업로드 (홈택스 엑셀)</DialogTitle></DialogHeader>
            <div className="flex gap-2 mb-3">
              {(['매출', '매입'] as const).map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={direction === d ? 'default' : 'outline'}
                  onClick={() => setDirection(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
            <FileUpload onFile={handleUpload} loading={uploading} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { title: '매출 합계', rows: sales, color: 'text-blue-600' },
          { title: '매입 합계', rows: purchases, color: 'text-red-600' },
        ].map(({ title, rows: r, color }) => (
          <Card key={title}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{title}</p>
              <p className={`text-xl font-bold ${color}`}>
                {formatKRW(r.reduce((s, x) => s + Number(x.amount), 0))}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                부가세 {formatKRW(r.reduce((s, x) => s + Number(x.tax), 0))} · {r.length}건
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {['매출', '매입'].map((dir) => (
        <Card key={dir}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{dir} 세금계산서</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>발급일</TableHead>
                  <TableHead>{dir === '매출' ? '공급받는자' : '공급자'}</TableHead>
                  <TableHead>품목</TableHead>
                  <TableHead className="text-right">공급가액</TableHead>
                  <TableHead className="text-right">세액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">불러오는 중...</TableCell></TableRow>
                )}
                {!loading && rows.filter((r) => r.direction === dir).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">데이터 없음</TableCell></TableRow>
                )}
                {rows.filter((r) => r.direction === dir).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{row.issue_date}</TableCell>
                    <TableCell className="text-sm">{row.supplier}</TableCell>
                    <TableCell className="text-xs text-slate-500">{row.item}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatKRW(Number(row.amount))}</TableCell>
                    <TableCell className="text-right text-sm text-slate-500">{formatKRW(Number(row.tax))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
