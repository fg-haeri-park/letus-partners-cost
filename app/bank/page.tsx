'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload } from '@/components/upload/file-upload'
import { TransactionDetailDialog } from '@/components/bank/transaction-detail-dialog'
import { MOCK_BANK_TRANSACTIONS, MOCK_ACCOUNTS, MOCK_TRANSACTION_DETAILS, IS_MOCK } from '@/lib/mock-data'
import { formatKRW } from '@/lib/utils'
import { Download, Upload, Search, ListTree } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

type Transaction = {
  id: string
  date: string
  type: string
  amount: number
  description: string
  account_id: string | null
  memo: string | null
  is_bulk?: boolean
  accounts?: { name: string } | null
}

export default function BankPage() {
  const { selectedCompany, selectedYm } = useAppStore()
  const { canEdit } = useAuth()
  const [rows, setRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])

  // 대량이체 상세 다이얼로그
  const [detailTarget, setDetailTarget] = useState<Transaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // 대량이체별 하위내역 건수 캐시 (배지 표시용)
  const [detailCounts, setDetailCounts] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return
    setLoading(true)
    if (IS_MOCK) {
      const txs = MOCK_BANK_TRANSACTIONS as Transaction[]
      setRows(txs)
      // 상세내역 건수 초기화
      const counts: Record<string, number> = {}
      txs.filter((r) => r.is_bulk).forEach((r) => {
        counts[r.id] = (MOCK_TRANSACTION_DETAILS[r.id] ?? []).length
      })
      setDetailCounts(counts)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('bank_transactions')
      .select('*, accounts(name)')
      .eq('company_id', selectedCompany.id)
      .gte('date', `${selectedYm}-01`)
      .lte('date', `${selectedYm}-31`)
      .order('date', { ascending: true })
    setRows(data ?? [])
    // 대량이체 상세 건수 조회
    const bulkIds = (data ?? []).filter((r: Transaction) => r.is_bulk).map((r: Transaction) => r.id)
    if (bulkIds.length > 0) {
      const { data: counts } = await supabase
        .from('transaction_details')
        .select('transaction_id')
        .in('transaction_id', bulkIds)
      const map: Record<string, number> = {}
      for (const r of counts ?? []) {
        map[r.transaction_id] = (map[r.transaction_id] ?? 0) + 1
      }
      setDetailCounts(map)
    }
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
    formData.append('ym', selectedYm)
    try {
      const res = await fetch('/api/upload/bank', { method: 'POST', body: formData })
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
    if (IS_MOCK) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, account_id } : r))
      return
    }
    await supabase.from('bank_transactions').update({ account_id }).eq('id', id)
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, account_id } : r))
  }

  async function handleExcel() {
    if (!selectedCompany) return
    const res = await fetch(`/api/export/excel?type=bank&company_id=${selectedCompany.id}&ym=${selectedYm}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `통장내역_${selectedCompany.name}_${selectedYm}.xlsx`
    a.click()
  }

  function openDetail(row: Transaction) {
    setDetailTarget(row)
    setDetailOpen(true)
  }

  function onDetailSaved() {
    // 저장 후 상세 건수 갱신
    if (detailTarget) {
      const count = IS_MOCK
        ? (MOCK_TRANSACTION_DETAILS[detailTarget.id] ?? []).length
        : detailCounts[detailTarget.id] // 실제 모드는 재조회
      setDetailCounts((prev) => ({ ...prev, [detailTarget.id]: count }))
    }
    fetchData()
  }

  const filtered = rows.filter(
    (r) => r.description.includes(search) || (r.memo ?? '').includes(search)
  )

  const totalIn = filtered.filter((r) => r.type === '입금').reduce((s, r) => s + Number(r.amount), 0)
  const totalOut = filtered.filter((r) => r.type === '출금').reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">통장내역</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedCompany?.name} · {selectedYm?.replace('-', '년 ')}월
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            {canEdit && <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload size={14} className="mr-1.5" />업로드</Button>}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>통장내역 업로드</DialogTitle>
              </DialogHeader>
              <div className="text-xs text-slate-500 mb-3">
                필수 컬럼: 일자, 적요/내용, 입금액, 출금액, 잔액
              </div>
              <FileUpload onFile={handleUpload} loading={uploading} />
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleExcel}>
            <Download size={14} className="mr-1.5" />Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '총 입금', value: totalIn, color: 'text-blue-600' },
          { label: '총 출금', value: totalOut, color: 'text-red-600' },
          { label: '순변동', value: totalIn - totalOut, color: totalIn - totalOut >= 0 ? 'text-emerald-600' : 'text-red-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{formatKRW(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm">거래 내역 ({filtered.length}건)</CardTitle>
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="적요 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <p className="text-xs text-slate-400 ml-auto">
              <ListTree size={12} className="inline mr-1" />대량이체 행 클릭 시 내역 입력
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-24">일자</TableHead>
                  <TableHead className="w-16">구분</TableHead>
                  <TableHead>적요</TableHead>
                  <TableHead className="text-right w-36">금액</TableHead>
                  <TableHead className="w-44">계정과목</TableHead>
                  <TableHead>메모</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">불러오는 중...</TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">데이터가 없습니다.</TableCell></TableRow>
                )}
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className={row.is_bulk ? 'bg-amber-50/60 hover:bg-amber-50 cursor-pointer' : 'hover:bg-slate-50'}
                    onClick={row.is_bulk ? () => openDetail(row) : undefined}
                  >
                    <TableCell className="text-xs">{row.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant={row.type === '입금' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.is_bulk && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                            <ListTree size={11} />
                            대량이체
                          </span>
                        )}
                        <span className="text-sm">{row.is_bulk ? (row.memo || '') : row.description}</span>
                        {row.is_bulk && (detailCounts[row.id] ?? 0) > 0 && (
                          <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                            {detailCounts[row.id]}건
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${row.type === '입금' ? 'text-blue-600' : 'text-red-600'}`}>
                      {row.type === '입금' ? '+' : '-'}{formatKRW(Number(row.amount))}
                    </TableCell>
                    <TableCell onClick={(e) => row.is_bulk && e.stopPropagation()}>
                      {row.is_bulk ? (
                        <span className="text-xs text-slate-400 italic">내역 클릭으로 입력</span>
                      ) : (
                        <select
                          className="text-xs border rounded px-1.5 py-1 w-full bg-white"
                          value={row.account_id ?? ''}
                          onChange={(e) => updateAccount(row.id, e.target.value)}
                          disabled={!canEdit}
                        >
                          <option value="">-- 선택 --</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{row.is_bulk ? '' : row.memo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TransactionDetailDialog
        transaction={detailTarget}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSaved={onDetailSaved}
      />
    </div>
  )
}
