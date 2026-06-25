import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_BANK_TRANSACTIONS, MOCK_ACCOUNTS } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get('company_id')
  const ym = p.get('ym')

  if (IS_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txns = (MOCK_BANK_TRANSACTIONS as any[]).filter(
      (r: any) => r.company_id === companyId && (!ym || r.date?.startsWith(ym))
    )
    return NextResponse.json({ transactions: txns, accounts: MOCK_ACCOUNTS })
  }

  if (!companyId) return NextResponse.json({ error: 'company_id 필요' }, { status: 400 })

  try {
    const conditions = ['bt.company_id = $1']
    const params: unknown[] = [companyId]
    if (ym) { conditions.push(`to_char(bt.date, 'YYYY-MM') = $2`); params.push(ym) }

    const [transactions, accounts] = await Promise.all([
      query(
        `SELECT bt.*, a.name as account_name, a.category as account_category
         FROM bank_transactions bt
         LEFT JOIN accounts a ON a.id = bt.account_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY bt.date DESC`,
        params
      ),
      query('SELECT * FROM accounts ORDER BY sort_order'),
    ])
    return NextResponse.json({ transactions, accounts })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
