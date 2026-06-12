import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const company_id = formData.get('company_id') as string

    if (!file || !company_id) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const records: {
      company_id: string
      used_at: string
      amount: number
      merchant: string
      card_number: string
    }[] = []

    for (const row of rawRows) {
      const rawDate = row['이용일시'] ?? row['이용일'] ?? row['거래일'] ?? row['승인일시'] ?? ''
      let used_at = String(rawDate).trim()
      if (!used_at) continue

      // 날짜만 있는 경우 처리
      if (/^\d{4}[.\-/]\d{2}[.\-/]\d{2}$/.test(used_at)) {
        used_at = used_at.replace(/[./]/g, '-') + ' 00:00:00'
      }

      const merchant = String(row['이용처'] ?? row['가맹점명'] ?? row['가맹점'] ?? '').trim()
      const rawAmount = String(row['이용금액'] ?? row['금액'] ?? row['승인금액'] ?? '0')
      const amount = parseFloat(rawAmount.replace(/,/g, '')) || 0
      const card_number = String(row['카드번호'] ?? row['카드'] ?? '').trim()

      if (!merchant || amount === 0) continue
      records.push({ company_id, used_at, amount, merchant, card_number })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: '파싱된 데이터가 없습니다' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase.from('card_purchases').insert(records)
    if (error) throw new Error(error.message)

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
