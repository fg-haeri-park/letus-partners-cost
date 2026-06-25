import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_BANK_TRANSACTIONS } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get('company_id')
  const centerId = p.get('center_id')
  const ym = p.get('ym')

  if (IS_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows = (MOCK_BANK_TRANSACTIONS as any[]).filter((r: any) => r.company_id === companyId)
    if (centerId) rows = rows.filter((r: any) => r.center_id === centerId)
    if (ym) rows = rows.filter((r: any) => r.date?.startsWith(ym))
    return NextResponse.json(rows)
  }

  if (!companyId) return NextResponse.json({ error: 'company_id 필요' }, { status: 400 })

  try {
    const conditions = ['bt.company_id = $1']
    const params: unknown[] = [companyId]
    let i = 2
    if (centerId) { conditions.push(`bt.center_id = $${i++}`); params.push(centerId) }
    if (ym) {
      conditions.push(`to_char(bt.date, 'YYYY-MM') = $${i++}`)
      params.push(ym)
    }

    const rows = await query(
      `SELECT bt.*, a.name as account_name
       FROM bank_transactions bt
       LEFT JOIN accounts a ON a.id = bt.account_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY bt.date DESC, bt.created_at DESC`,
      params
    )
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { id, account_id, memo } = await req.json()
  if (IS_MOCK) return NextResponse.json({ ok: true })
  try {
    await query(
      'UPDATE bank_transactions SET account_id = $1, memo = $2 WHERE id = $3',
      [account_id ?? null, memo ?? null, id]
    )
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
