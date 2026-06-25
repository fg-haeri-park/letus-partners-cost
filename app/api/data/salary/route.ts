import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_SALARIES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get('company_id')
  const ym = p.get('ym')

  if (IS_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows = (MOCK_SALARIES as any[]).filter((r: any) => r.company_id === companyId)
    if (ym) rows = rows.filter((r: any) => r.ym === ym)
    return NextResponse.json(rows)
  }

  if (!companyId) return NextResponse.json({ error: 'company_id 필요' }, { status: 400 })

  try {
    const conditions = ['company_id = $1']
    const params: unknown[] = [companyId]
    if (ym) { conditions.push(`ym = $2`); params.push(ym) }

    const rows = await query(
      `SELECT * FROM salaries WHERE ${conditions.join(' AND ')} ORDER BY employee_name`,
      params
    )
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
