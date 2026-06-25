import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_MONTHLY_SUMMARY } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get('company_id')
  const centerId = p.get('center_id')
  const ym = p.get('ym')

  if (IS_MOCK) {
    const data = MOCK_MONTHLY_SUMMARY[companyId ?? ''] ?? {}
    return NextResponse.json(data)
  }

  if (!companyId || !ym) return NextResponse.json({ error: 'company_id, ym 필요' }, { status: 400 })

  try {
    const conditions = ['company_id = $1', 'ym = $2']
    const params: unknown[] = [companyId, ym]
    if (centerId) { conditions.push(`center_id = $3`); params.push(centerId) }

    const rows = await query<{ account_id: string; amount: string }>(
      `SELECT account_id, SUM(amount) as amount FROM monthly_summary
       WHERE ${conditions.join(' AND ')} GROUP BY account_id`,
      params
    )
    // account_id → amount 맵으로 반환
    const map: Record<string, number> = {}
    for (const r of rows) map[r.account_id] = Number(r.amount)
    return NextResponse.json(map)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
