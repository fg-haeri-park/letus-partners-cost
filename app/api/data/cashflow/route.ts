import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_CASH_FLOW } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get('company_id')
  const ym = p.get('ym')

  if (IS_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((MOCK_CASH_FLOW ?? []) as any[]).filter(
      (r: any) => r.company_id === companyId && (!ym || r.ym === ym)
    )
    return NextResponse.json(rows)
  }

  if (!companyId || !ym) return NextResponse.json({ error: 'company_id, ym 필요' }, { status: 400 })

  try {
    const rows = await query(
      `SELECT * FROM cash_flow_daily WHERE company_id = $1 AND ym = $2 ORDER BY sort_order`,
      [companyId, ym]
    )
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (IS_MOCK) return NextResponse.json({ ok: true })
  try {
    const { company_id, ym, category, label, amount, sort_order } = body
    await query(
      `INSERT INTO cash_flow_daily (company_id, ym, category, label, amount, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING`,
      [company_id, ym, category, label, amount ?? 0, sort_order ?? 0]
    )
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { id, amount } = await req.json()
  if (IS_MOCK) return NextResponse.json({ ok: true })
  try {
    await query('UPDATE cash_flow_daily SET amount = $1 WHERE id = $2', [amount, id])
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
