'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload } from '@/components/upload/file-upload'
import { MOCK_CARD_PURCHASES, MOCK_ACCOUNTS, IS_MOCK } from '@/lib/mock-data'
import { formatKRW } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

type CardPurchase = {
  id: string
  used_at: string
  amount: number
  merchant: string
  card_number: string | null
  account_id: string | null
  accounts?: { name: string } | null
}

export default function CardPage() {
  const { selectedCompany, selectedYm } = useAppStore()
  const { canEdit } = useAuth()
  const [rows, setRows] = useState<CardPurchase[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return
    setLoading(true)
    if (IS_MOCK) { setRows(MOCK_CARD_PURCHASES as CardPurchase[]); setLoading(false); return }
    const { data } = await supabase
      .from('card_purchases')
      .select('*, accounts(name)')
      .eq('company_id', selectedCompany.id)
      .gte('used_at', `${selectedYm}-01`)
      .lte('used_at', `${selectedYm}-31`)
      .order('used_at')
    setRows(data ?? [])
    setLoading(false)
  }, [selectedCompany, selectedYm])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    if (IS_MOCK) { setAccounts(MOCK_ACCOUNTS.map((a) => ({ id: a.id, name: a.name }))); return }
    supabase.from('accounts').select('id, name').order('sort_order').then(({ data }) => {
      if (data) setAccounts(data)
    })
  }, [])

  async function handleUpload(file: File) {
    if (!selectedCompany) { toast.error('법인을 먼저 선택하세요'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('company_id', selectedCompany.id)
    try {
      const res = await fetch('/api/upload/card', { method: 'POST', body: formData })
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

  async function updateAccount(id: string, account_id: string) {
    await supabase.from('card_purchases').update({ account_id }).eq('id', id)
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, account_id } : r))
  }

  const total = rows.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">카드매입</h2>
          <p className="text-sm text-slate-500 mt-0.5">{selectedCompany?.name} · {selectedYm}</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          {canEdit && <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload size={14} className="mr-1.5" />카드사 업로드</Button>}
          <DialogContent>
            <DialogHeader><DialogTitle>카드매입 업로드</DialogTitle></DialogHeader>
            <p className="text-xs text-slate-500 mb-3">필수 컬럼: 이용일시, 이용처(가맹점), 이용금액</p>
            <FileUpload onFile={handleUpload} loading={uploading} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-6">
          <div>
            <p className="text-xs text-slate-500">총 카드매입</p>
            <p className="text-xl font-bold text-red-600">{formatKRW(total)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">건수</p>
            <p className="text-xl font-bold">{rows.length}건</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">카드 사용 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>이용일시</TableHead>
                <TableHead>가맹점</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>카드번호</TableHead>
                <TableHead className="w-40">계정과목</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">불러오는 중...</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">데이터 없음</TableCell></TableRow>}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{String(row.used_at).slice(0, 10)}</TableCell>
                  <TableCell className="text-sm">{row.merchant}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-red-600">{formatKRW(Number(row.amount))}</TableCell>
                  <TableCell className="text-xs text-slate-400">{row.card_number}</TableCell>
                  <TableCell>
                    <select
                      className="text-xs border rounded px-1.5 py-1 w-full bg-white"
                      value={row.account_id ?? ''}
                      onChange={(e) => updateAccount(row.id, e.target.value)}
                    >
                      <option value="">-- 선택 --</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
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
