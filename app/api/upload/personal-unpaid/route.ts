import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { query } from '@/lib/db'

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
      employee_name: string
      date: string
      item: string
      amount: number
      note: string
    }[] = []

    for (const row of rawRows) {
      const employee_name = String(row['성명'] ?? row['이름'] ?? '').trim()
      if (!employee_name) continue

      const rawDate = row['일자'] ?? row['날짜'] ?? row['date'] ?? ''
      let date = String(rawDate).replace(/\./g, '-').replace(/\//g, '-').slice(0, 10)
      if (!date || date.length < 10) continue

      const item = String(row['항목'] ?? row['내용'] ?? '').trim()
      const amount = parseFloat(String(row['금액'] ?? '0').replace(/,/g, '')) || 0
      const note = String(row['비고'] ?? row['메모'] ?? '').trim()

      if (!item || amount === 0) continue
      records.push({ company_id, employee_name, date, item, amount, note })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: '파싱된 데이터가 없습니다' }, { status: 400 })
    }

    for (const r of records) {
      await query(
        `INSERT INTO personal_unpaid (company_id, employee_name, date, item, amount, note) VALUES ($1,$2,$3,$4,$5,$6)`,
        [r.company_id, r.employee_name, r.date, r.item, r.amount, r.note]
      )
    }

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
