import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_PERSONAL_UNPAID } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const companyId = p.get('company_id')

  if (IS_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (MOCK_PERSONAL_UNPAID as any[]).filter((r: any) => r.company_id === companyId)
    return NextResponse.json(rows)
  }

  if (!companyId) return NextResponse.json({ error: 'company_id 필요' }, { status: 400 })

  try {
    const rows = await query(
      `SELECT * FROM personal_unpaid WHERE company_id = $1 ORDER BY date DESC`,
      [companyId]
    )
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
