import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { company_id, ym } = await req.json()
    if (!company_id || !ym) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

    await query('DELETE FROM monthly_summary WHERE company_id = $1 AND ym = $2', [company_id, ym])

    const records: { company_id: string; ym: string; account_id: string; amount: number }[] = []

    const bankRows = await query<{ account_id: string; type: string; amount: string }>(
      `SELECT account_id, type, amount FROM bank_transactions
       WHERE company_id = $1 AND to_char(date, 'YYYY-MM') = $2 AND account_id IS NOT NULL`,
      [company_id, ym]
    )
    const bankMap: Record<string, number> = {}
    for (const row of bankRows) {
      const sign = row.type === '입금' ? 1 : -1
      bankMap[row.account_id] = (bankMap[row.account_id] ?? 0) + Number(row.amount) * sign
    }
    for (const [account_id, amount] of Object.entries(bankMap)) {
      records.push({ company_id, ym, account_id, amount })
    }

    const salaryAccount = await queryOne<{ id: string }>('SELECT id FROM accounts WHERE name = $1 LIMIT 1', ['직원급여'])
    if (salaryAccount) {
      const salaryRows = await query<{ base_pay: string; allowance: string }>(
        'SELECT base_pay, allowance FROM salaries WHERE company_id = $1 AND ym = $2',
        [company_id, ym]
      )
      const totalSalary = salaryRows.reduce((s, r) => s + Number(r.base_pay) + Number(r.allowance), 0)
      if (totalSalary > 0) {
        const existing = records.find(r => r.account_id === salaryAccount.id)
        if (existing) existing.amount += totalSalary
        else records.push({ company_id, ym, account_id: salaryAccount.id, amount: totalSalary })
      }
    }

    const salesAccount = await queryOne<{ id: string }>('SELECT id FROM accounts WHERE name = $1 LIMIT 1', ['용역매출'])
    if (salesAccount) {
      const invoiceRows = await query<{ amount: string }>(
        `SELECT amount FROM invoices WHERE company_id = $1 AND direction = '매출' AND to_char(issue_date, 'YYYY-MM') = $2`,
        [company_id, ym]
      )
      const totalSales = invoiceRows.reduce((s, r) => s + Number(r.amount), 0)
      if (totalSales > 0) {
        const existing = records.find(r => r.account_id === salesAccount.id)
        if (existing) existing.amount = totalSales
        else records.push({ company_id, ym, account_id: salesAccount.id, amount: totalSales })
      }
    }

    if (records.length === 0) return NextResponse.json({ message: '집계할 데이터가 없습니다', count: 0 })

    for (const r of records) {
      await query(
        'INSERT INTO monthly_summary (company_id, ym, account_id, amount) VALUES ($1,$2,$3,$4)',
        [r.company_id, r.ym, r.account_id, r.amount]
      )
    }

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
