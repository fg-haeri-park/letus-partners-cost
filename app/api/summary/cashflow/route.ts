import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { company_id, ym } = await req.json()
    if (!company_id || !ym) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

    await query('DELETE FROM cash_flow_daily WHERE company_id = $1 AND ym = $2', [company_id, ym])

    const bankIn = await query<{ amount: string; account_name: string }>(
      `SELECT bt.amount, a.name as account_name FROM bank_transactions bt
       LEFT JOIN accounts a ON a.id = bt.account_id
       WHERE bt.company_id = $1 AND bt.type = '입금' AND to_char(bt.date, 'YYYY-MM') = $2`,
      [company_id, ym]
    )
    const bankOut = await query<{ amount: string; account_name: string }>(
      `SELECT bt.amount, a.name as account_name FROM bank_transactions bt
       LEFT JOIN accounts a ON a.id = bt.account_id
       WHERE bt.company_id = $1 AND bt.type = '출금' AND to_char(bt.date, 'YYYY-MM') = $2`,
      [company_id, ym]
    )
    const salaries = await query<{ net_pay: string; job_type: string }>(
      'SELECT net_pay, job_type FROM salaries WHERE company_id = $1 AND ym = $2',
      [company_id, ym]
    )
    const cards = await query<{ amount: string }>(
      `SELECT amount FROM card_purchases WHERE company_id = $1 AND to_char(used_at, 'YYYY-MM') = $2`,
      [company_id, ym]
    )

    const records: { company_id: string; ym: string; category: string; label: string; amount: number; sort_order: number }[] = []
    records.push({ company_id, ym, category: '이월', label: '전월 이월금액', amount: 0, sort_order: 0 })

    const inGroups: Record<string, number> = {}
    for (const row of bankIn) {
      const label = row.account_name ?? '기타입금'
      inGroups[label] = (inGroups[label] ?? 0) + Number(row.amount)
    }
    let inOrder = 10
    for (const [label, amount] of Object.entries(inGroups)) {
      records.push({ company_id, ym, category: '입금', label, amount, sort_order: inOrder++ })
    }

    const salaryByType: Record<string, number> = {}
    for (const s of salaries) {
      salaryByType[s.job_type] = (salaryByType[s.job_type] ?? 0) + Number(s.net_pay)
    }
    let outOrder = 20
    for (const [jt, amt] of Object.entries(salaryByType)) {
      records.push({ company_id, ym, category: '출금', label: `급여(${jt})`, amount: amt, sort_order: outOrder++ })
    }

    const cardTotal = cards.reduce((s, r) => s + Number(r.amount), 0)
    if (cardTotal > 0) {
      records.push({ company_id, ym, category: '출금', label: '법인카드', amount: cardTotal, sort_order: outOrder++ })
    }

    const outGroups: Record<string, number> = {}
    for (const row of bankOut) {
      const label = row.account_name ?? '기타출금'
      if (label.includes('급여')) continue
      outGroups[label] = (outGroups[label] ?? 0) + Number(row.amount)
    }
    for (const [label, amount] of Object.entries(outGroups)) {
      records.push({ company_id, ym, category: '출금', label, amount, sort_order: outOrder++ })
    }

    for (const r of records) {
      await query(
        'INSERT INTO cash_flow_daily (company_id, ym, category, label, amount, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
        [r.company_id, r.ym, r.category, r.label, r.amount, r.sort_order]
      )
    }

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
