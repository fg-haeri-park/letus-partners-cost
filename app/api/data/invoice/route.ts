import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_INVOICES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get('company_id')
  const ym = p.get('ym')

  if (IS_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows = (MOCK_INVOICES as any[]).filter((r: any) => r.company_id === companyId)
    if (ym) rows = rows.filter((r: any) => r.issue_date?.startsWith(ym))
    return NextResponse.json(rows)
  }

  if (!companyId) return NextResponse.json({ error: 'company_id 필요' }, { status: 400 })

  try {
    const conditions = ['company_id = $1']
    const params: unknown[] = [companyId]
    if (ym) { conditions.push(`to_char(issue_date, 'YYYY-MM') = $2`); params.push(ym) }

    const rows = await query(
      `SELECT * FROM invoices WHERE ${conditions.join(' AND ')} ORDER BY issue_date DESC`,
      params
    )
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
