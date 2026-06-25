import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_CENTERS } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (IS_MOCK) {
    const filtered = companyId ? MOCK_CENTERS.filter(c => c.company_id === companyId) : MOCK_CENTERS
    return NextResponse.json(filtered)
  }
  try {
    const rows = companyId
      ? await query('SELECT id, company_id, name, type FROM centers WHERE company_id = $1 ORDER BY name', [companyId])
      : await query('SELECT id, company_id, name, type FROM centers ORDER BY name')
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
