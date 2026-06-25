import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const company_id = formData.get('company_id') as string
    const direction = formData.get('direction') as string // '매출' | '매입'

    if (!file || !company_id || !direction) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const records: {
      company_id: string
      direction: string
      issue_date: string
      supplier: string
      amount: number
      tax: number
      item: string
    }[] = []

    for (const row of rawRows) {
      const rawDate = row['작성일'] ?? row['발급일'] ?? row['날짜'] ?? ''
      let issue_date = String(rawDate).replace(/\./g, '-').replace(/\//g, '-').slice(0, 10)
      if (!issue_date || issue_date.length < 10) continue

      const supplier = String(
        direction === '매출'
          ? (row['공급받는자'] ?? row['거래처'] ?? '')
          : (row['공급자'] ?? row['거래처'] ?? '')
      ).trim()

      const amount = parseFloat(String(row['공급가액'] ?? row['금액'] ?? '0').replace(/,/g, '')) || 0
      const tax = parseFloat(String(row['세액'] ?? '0').replace(/,/g, '')) || 0
      const item = String(row['품목'] ?? row['품명'] ?? '').trim()

      if (!supplier || amount === 0) continue
      records.push({ company_id, direction, issue_date, supplier, amount, tax, item })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: '파싱된 데이터가 없습니다' }, { status: 400 })
    }

    for (const r of records) {
      await query(
        `INSERT INTO invoices (company_id, direction, issue_date, supplier, amount, tax, item) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [r.company_id, r.direction, r.issue_date, r.supplier, r.amount, r.tax, r.item]
      )
    }

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
