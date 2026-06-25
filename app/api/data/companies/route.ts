import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_COMPANIES } from '@/lib/mock-data'

export async function GET() {
  if (IS_MOCK) return NextResponse.json(MOCK_COMPANIES)
  try {
    const rows = await query('SELECT id, name, code FROM companies ORDER BY name')
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
