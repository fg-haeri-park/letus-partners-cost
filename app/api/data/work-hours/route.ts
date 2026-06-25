import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_WORK_HOURS } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get('company_id')
  const ym = p.get('ym')

  if (IS_MOCK) {
    const data = companyId && ym ? (MOCK_WORK_HOURS[companyId]?.[ym] ?? null) : null
    return NextResponse.json(data)
  }

  if (!companyId || !ym) return NextResponse.json(null)

  try {
    const rows = await query(
      'SELECT total_hours, weighted_hours, headcount FROM monthly_work_hours WHERE company_id = $1 AND ym = $2',
      [companyId, ym]
    )
    return NextResponse.json(rows[0] ?? null)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
