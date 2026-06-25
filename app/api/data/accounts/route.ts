import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_ACCOUNTS } from '@/lib/mock-data'

export async function GET() {
  if (IS_MOCK) return NextResponse.json(MOCK_ACCOUNTS)
  try {
    const rows = await query('SELECT id, company_id, category, sub_category, name, sort_order FROM accounts ORDER BY sort_order')
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
