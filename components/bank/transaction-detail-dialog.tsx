'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatKRW } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { IS_MOCK, MOCK_TRANSACTION_DETAILS, MOCK_ACCOUNTS } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type Account = { id: string; name: string; category: string }

type DetailRow = {
  id: string
  transaction_id: string
  description: string
  amount: number
  account_id: string | null
  note: string | null
}

type Transaction = {
  id: string
  date: string
  amount: number
  description: string
  memo: string | null
}

type Props = {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved?: () => void
}

const EMPTY_ROW = { description: '', amount: '', account_id: '', note: '' }

export function TransactionDetailDialog({ transaction, open, onOpenChange, onSaved }: Props) {
  const { canEdit } = useAuth()
  const [details, setDetails] = useState<DetailRow[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [newRow, setNewRow] = useState(EMPTY_ROW)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !transaction) return
    loadData()
  }, [open, transaction])

  async function loadData() {
    setLoading(true)
    if (IS_MOCK) {
      setDetails((MOCK_TRANSACTION_DETAILS[transaction!.id] ?? []) as DetailRow[])
      setAccounts(MOCK_ACCOUNTS.map((a) => ({ id: a.id, name: a.name, category: a.category })))
      setLoading(false)
      return
    }
    const [{ data: accs }, { data: rows }] = await Promise.all([
      supabase.from('accounts').select('id, name, category').order('sort_order'),
      supabase.from('transaction_details').select('*').eq('transaction_id', transaction!.id).order('created_at'),
    ])
    setAccounts(accs ?? [])
    setDetails(rows ?? [])
    setLoading(false)
  }

  const totalAllocated = details.reduce((s, r) => s + Number(r.amount), 0)
  const remaining = (transaction?.amount ?? 0) - totalAllocated
  const isBalanced = Math.abs(remaining) < 1

  function handleNewRowChange(field: string, value: string) {
    setNewRow((prev) => ({ ...prev, [field]: value }))
  }

  async function addRow() {
    if (!newRow.description.trim()) { toast.error('내용을 입력하세요'); return }
    const amt = Number(newRow.amount.replace(/,/g, ''))
    if (!amt || amt <= 0) { toast.error('금액을 올바르게 입력하세요'); return }

    const row: DetailRow = {
      id: `td-new-${Date.now()}`,
      transaction_id: transaction!.id,
      description: newRow.description,
      amount: amt,
      account_id: newRow.account_id || null,
      note: newRow.note || null,
    }

    if (IS_MOCK) {
      setDetails((prev) => [...prev, row])
      setNewRow(EMPTY_ROW)
      return
    }

    const { data, error } = await supabase
      .from('transaction_details')
      .insert({
        transaction_id: transaction!.id,
        description: newRow.description,
        amount: amt,
        account_id: newRow.account_id || null,
        note: newRow.note || null,
      })
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    setDetails((prev) => [...prev, data])
    setNewRow(EMPTY_ROW)
  }

  async function deleteRow(id: string) {
    if (IS_MOCK) {
      setDetails((prev) => prev.filter((r) => r.id !== id))
      return
    }
    await supabase.from('transaction_details').delete().eq('id', id)
    setDetails((prev) => prev.filter((r) => r.id !== id))
  }

  async function saveAll() {
    if (IS_MOCK) {
      // mock 모드: MOCK_TRANSACTION_DETAILS 메모리 업데이트
      MOCK_TRANSACTION_DETAILS[transaction!.id] = details
      toast.success('저장 완료')
      onSaved?.()
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      // 계정과목 태깅: account_id가 있는 details를 transaction 자체에도 반영
      // (account_id가 단일이면 transaction에 직접 설정)
      if (details.length === 1 && details[0].account_id) {
        await supabase
          .from('bank_transactions')
          .update({ account_id: details[0].account_id })
          .eq('id', transaction!.id)
      }
      toast.success('저장 완료')
      onSaved?.()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const accountName = (id: string | null) =>
    id ? (accounts.find((a) => a.id === id)?.name ?? '-') : '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>대량이체 상세내역</DialogTitle>
        </DialogHeader>

        {transaction && (
          <>
            {/* 거래 요약 */}
            <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{transaction.date} · {transaction.memo || transaction.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">이체 총액</p>
              </div>
              <p className="text-xl font-bold text-slate-900">{formatKRW(transaction.amount)}</p>
            </div>

            {/* 배분 현황 바 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>배분 완료: {formatKRW(totalAllocated)}</span>
                <span className={remaining !== 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                  {remaining > 0 ? `미배분: ${formatKRW(remaining)}` : remaining < 0 ? `초과: ${formatKRW(-remaining)}` : '배분 완료 ✓'}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isBalanced ? 'bg-emerald-500' : totalAllocated > transaction.amount ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min((totalAllocated / transaction.amount) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 내역 테이블 */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>내용</TableHead>
                    <TableHead>계정과목</TableHead>
                    <TableHead className="text-right w-36">금액</TableHead>
                    <TableHead className="w-32">비고</TableHead>
                    {canEdit && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-400">불러오는 중...</TableCell></TableRow>
                  )}
                  {!loading && details.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-400">입력된 내역이 없습니다</TableCell></TableRow>
                  )}
                  {details.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm">{row.description}</TableCell>
                      <TableCell className="text-xs text-slate-500">{accountName(row.account_id)}</TableCell>
                      <TableCell className="text-right font-medium text-sm">{formatKRW(Number(row.amount))}</TableCell>
                      <TableCell className="text-xs text-slate-400">{row.note}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <button onClick={() => deleteRow(row.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {/* 합계 행 */}
                  {details.length > 0 && (
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell colSpan={2} className="text-xs text-slate-500">합계</TableCell>
                      <TableCell className="text-right">{formatKRW(totalAllocated)}</TableCell>
                      <TableCell colSpan={canEdit ? 2 : 1} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 새 행 입력 (수정 권한자만) */}
            {canEdit && (
              <div className="border rounded-lg p-3 space-y-2 bg-blue-50/50">
                <p className="text-xs font-medium text-slate-600">내역 추가</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="내용"
                    value={newRow.description}
                    onChange={(e) => handleNewRowChange('description', e.target.value)}
                    className="h-8 text-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addRow()}
                  />
                  <select
                    value={newRow.account_id}
                    onChange={(e) => handleNewRowChange('account_id', e.target.value)}
                    className="h-8 border rounded px-2 text-sm bg-white w-40 shrink-0"
                  >
                    <option value="">계정과목 선택</option>
                    {['매출', '변동비', '고정비'].map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {accounts.filter((a) => a.category === cat).map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <Input
                    placeholder="금액"
                    value={newRow.amount}
                    onChange={(e) => handleNewRowChange('amount', e.target.value)}
                    className="h-8 text-sm w-32 shrink-0 text-right"
                    onKeyDown={(e) => e.key === 'Enter' && addRow()}
                  />
                  <Input
                    placeholder="비고"
                    value={newRow.note}
                    onChange={(e) => handleNewRowChange('note', e.target.value)}
                    className="h-8 text-sm w-24 shrink-0"
                    onKeyDown={(e) => e.key === 'Enter' && addRow()}
                  />
                  <Button size="sm" className="h-8 shrink-0" onClick={addRow}>
                    <Plus size={14} />
                  </Button>
                </div>

                {/* 잔액 힌트 */}
                {remaining > 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    미배분 {formatKRW(remaining)} — 전액 입력 후 저장하세요
                  </p>
                )}
                {isBalanced && details.length > 0 && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    이체금액과 일치합니다
                  </p>
                )}
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>닫기</Button>
              {canEdit && (
                <Button size="sm" onClick={saveAll} disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
