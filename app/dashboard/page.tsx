'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import {
  MOCK_ACCOUNTS, MOCK_MONTHLY_SUMMARY, MOCK_BANK_TRANSACTIONS, MOCK_MONTHLY_TREND, IS_MOCK
} from '@/lib/mock-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react'
import { formatKRW } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type Summary = {
  revenue: number
  variable_cost: number
  contribution: number
  fixed_cost: number
  operating_income: number
  bank_balance: number
}

export default function DashboardPage() {
  const { selectedCompany, selectedYm } = useAppStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [monthlyData, setMonthlyData] = useState<{ ym: string; revenue: number; operating_income: number }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedCompany) return
    setLoading(true)
    if (IS_MOCK) {
      const amounts = MOCK_MONTHLY_SUMMARY[selectedCompany.id] ?? {}
      let revenue = 0, variable_cost = 0, fixed_cost = 0
      for (const acc of MOCK_ACCOUNTS) {
        const amt = amounts[acc.id] ?? 0
        if (acc.category === '매출') revenue += amt
        else if (acc.category === '변동비') variable_cost += amt
        else if (acc.category === '고정비') fixed_cost += amt
      }
      const bank_balance = MOCK_BANK_TRANSACTIONS.reduce((s, r) =>
        s + (r.type === '입금' ? Number(r.amount) : -Number(r.amount)), 0)
      setSummary({ revenue, variable_cost, contribution: revenue - variable_cost, fixed_cost, operating_income: revenue - variable_cost - fixed_cost, bank_balance })
      setMonthlyData(MOCK_MONTHLY_TREND)
      setLoading(false)
      return
    }
    fetchSummary()
    fetchMonthlyTrend()
  }, [selectedCompany, selectedYm])

  async function fetchSummary() {
    if (!selectedCompany) return
    const { data: accounts } = await supabase.from('accounts').select('id, category, name')
    const { data: rows } = await supabase
      .from('monthly_summary')
      .select('account_id, amount')
      .eq('company_id', selectedCompany.id)
      .eq('ym', selectedYm)

    if (!accounts || !rows) { setLoading(false); return }

    const accMap = Object.fromEntries(accounts.map((a) => [a.id, a]))
    let revenue = 0, variable_cost = 0, fixed_cost = 0
    for (const row of rows) {
      const acc = accMap[row.account_id]
      if (!acc) continue
      if (acc.category === '매출') revenue += Number(row.amount)
      else if (acc.category === '변동비') variable_cost += Number(row.amount)
      else if (acc.category === '고정비') fixed_cost += Number(row.amount)
    }

    const { data: bankRows } = await supabase
      .from('bank_transactions')
      .select('type, amount')
      .eq('company_id', selectedCompany.id)
      .gte('date', `${selectedYm}-01`)
      .lte('date', `${selectedYm}-31`)

    let bank_balance = 0
    for (const r of bankRows ?? []) {
      bank_balance += r.type === '입금' ? Number(r.amount) : -Number(r.amount)
    }

    setSummary({
      revenue,
      variable_cost,
      contribution: revenue - variable_cost,
      fixed_cost,
      operating_income: revenue - variable_cost - fixed_cost,
      bank_balance,
    })
    setLoading(false)
  }

  async function fetchMonthlyTrend() {
    if (!selectedCompany) return
    const months: string[] = []
    const [y, m] = selectedYm.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const { data: accounts } = await supabase.from('accounts').select('id, category')
    const { data: rows } = await supabase
      .from('monthly_summary')
      .select('ym, account_id, amount')
      .eq('company_id', selectedCompany.id)
      .in('ym', months)

    if (!accounts || !rows) return

    const accMap = Object.fromEntries(accounts.map((a) => [a.id, a.category]))
    const trend = months.map((ym) => {
      const ymRows = rows.filter((r) => r.ym === ym)
      let revenue = 0, variable_cost = 0, fixed_cost = 0
      for (const r of ymRows) {
        const cat = accMap[r.account_id]
        if (cat === '매출') revenue += Number(r.amount)
        else if (cat === '변동비') variable_cost += Number(r.amount)
        else if (cat === '고정비') fixed_cost += Number(r.amount)
      }
      return { ym: ym.slice(5) + '월', revenue, operating_income: revenue - variable_cost - fixed_cost }
    })
    setMonthlyData(trend)
  }

  const cards = summary
    ? [
        { title: '용역수입', value: summary.revenue, icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: '공헌이익', value: summary.contribution, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: '영업이익', value: summary.operating_income, icon: summary.operating_income >= 0 ? TrendingUp : TrendingDown, color: summary.operating_income >= 0 ? 'text-emerald-600' : 'text-red-600', bg: summary.operating_income >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
        { title: '통장 순변동', value: summary.bank_balance, icon: Wallet, color: 'text-violet-600', bg: 'bg-violet-50' },
      ]
    : []

  const ymLabel = selectedYm
    ? `${selectedYm.split('-')[0]}년 ${Number(selectedYm.split('-')[1])}월`
    : ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">대시보드</h2>
        <p className="text-sm text-slate-500 mt-1">
          {selectedCompany ? `${selectedCompany.name} · ${ymLabel}` : '법인을 선택하세요'}
        </p>
      </div>

      {!selectedCompany && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            상단에서 법인을 선택하면 요약 정보가 표시됩니다.
          </CardContent>
        </Card>
      )}

      {selectedCompany && loading && (
        <div className="text-center py-12 text-slate-400">불러오는 중...</div>
      )}

      {selectedCompany && !loading && summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(({ title, value, icon: Icon, color, bg }) => (
              <Card key={title}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{title}</p>
                      <p className={`text-xl font-bold ${color}`}>{formatKRW(value)}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${bg}`}>
                      <Icon size={18} className={color} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">월별 매출 · 영업이익 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="ym" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}백만`} />
                    <Tooltip formatter={(v) => formatKRW(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="용역수입" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="operating_income" name="영업이익" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">손익 구조 ({ymLabel})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {[
                    { label: '① 용역수입', value: summary.revenue, indent: false, bold: false },
                    { label: '② 변동비', value: -summary.variable_cost, indent: false, bold: false },
                    { label: '③ 공헌이익 (①-②)', value: summary.contribution, indent: false, bold: true },
                    { label: '④ 고정비', value: -summary.fixed_cost, indent: false, bold: false },
                    { label: '⑤ 영업이익 (③-④)', value: summary.operating_income, indent: false, bold: true },
                  ].map(({ label, value, bold }) => (
                    <div key={label} className={`flex justify-between py-1.5 border-b border-slate-100 ${bold ? 'font-semibold bg-slate-50 px-2 rounded' : ''}`}>
                      <span className="text-slate-600">{label}</span>
                      <span className={value < 0 ? 'text-red-600' : 'text-slate-900'}>{formatKRW(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
