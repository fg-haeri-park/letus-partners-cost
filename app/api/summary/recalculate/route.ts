import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { company_id, ym } = await req.json()
    if (!company_id || !ym) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

    const supabase = createServerClient()

    // 기존 monthly_summary 삭제
    await supabase.from('monthly_summary').delete().eq('company_id', company_id).eq('ym', ym)

    const records: { company_id: string; ym: string; account_id: string; amount: number }[] = []

    // 통장내역에서 계정과목별 집계
    const { data: bankRows } = await supabase
      .from('bank_transactions')
      .select('account_id, type, amount')
      .eq('company_id', company_id)
      .gte('date', `${ym}-01`)
      .lte('date', `${ym}-31`)
      .not('account_id', 'is', null)

    const bankMap: Record<string, number> = {}
    for (const row of bankRows ?? []) {
      if (!row.account_id) continue
      const sign = row.type === '입금' ? 1 : -1
      bankMap[row.account_id] = (bankMap[row.account_id] ?? 0) + Number(row.amount) * sign
    }
    for (const [account_id, amount] of Object.entries(bankMap)) {
      records.push({ company_id, ym, account_id, amount })
    }

    // 급여에서 직원급여 계정과목 집계
    const { data: salaryAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('name', '직원급여')
    const salaryAccountId = salaryAccounts?.[0]?.id

    if (salaryAccountId) {
      const { data: salaryRows } = await supabase
        .from('salaries')
        .select('base_pay, allowance')
        .eq('company_id', company_id)
        .eq('ym', ym)

      const totalSalary = (salaryRows ?? []).reduce(
        (s, r) => s + Number(r.base_pay) + Number(r.allowance), 0
      )
      if (totalSalary > 0) {
        const existing = records.find((r) => r.account_id === salaryAccountId)
        if (existing) existing.amount += totalSalary
        else records.push({ company_id, ym, account_id: salaryAccountId, amount: totalSalary })
      }
    }

    // 세금계산서 매출 계정과목 집계
    const { data: salesAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('name', '용역매출')
    const salesAccountId = salesAccounts?.[0]?.id

    if (salesAccountId) {
      const { data: invoiceRows } = await supabase
        .from('invoices')
        .select('amount')
        .eq('company_id', company_id)
        .eq('direction', '매출')
        .gte('issue_date', `${ym}-01`)
        .lte('issue_date', `${ym}-31`)

      const totalSales = (invoiceRows ?? []).reduce((s, r) => s + Number(r.amount), 0)
      if (totalSales > 0) {
        const existing = records.find((r) => r.account_id === salesAccountId)
        if (existing) existing.amount = totalSales
        else records.push({ company_id, ym, account_id: salesAccountId, amount: totalSales })
      }
    }

    if (records.length === 0) {
      return NextResponse.json({ message: '집계할 데이터가 없습니다', count: 0 })
    }

    const { error } = await supabase.from('monthly_summary').insert(records)
    if (error) throw new Error(error.message)

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
