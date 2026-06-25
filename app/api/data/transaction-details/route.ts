import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { IS_MOCK, MOCK_TRANSACTION_DETAILS } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const transactionId = req.nextUrl.searchParams.get('transaction_id')
  if (!transactionId) return NextResponse.json([], )

  if (IS_MOCK) return NextResponse.json(MOCK_TRANSACTION_DETAILS[transactionId] ?? [])

  try {
    const rows = await query(
      `SELECT td.*, a.name as account_name FROM transaction_details td
       LEFT JOIN accounts a ON a.id = td.account_id
       WHERE td.transaction_id = $1 ORDER BY td.created_at`,
      [transactionId]
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
    const { transaction_id, description, amount, account_id, note } = body
    await query(
      `INSERT INTO transaction_details (transaction_id, description, amount, account_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [transaction_id, description, amount, account_id ?? null, note ?? null]
    )
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (IS_MOCK) return NextResponse.json({ ok: true })
  try {
    await query('DELETE FROM transaction_details WHERE id = $1', [id])
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DB 오류' }, { status: 500 })
  }
}
