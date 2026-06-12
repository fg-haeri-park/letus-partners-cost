import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const company_id = formData.get('company_id') as string
    const ym = formData.get('ym') as string

    if (!file || !company_id || !ym) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    if (rawRows.length === 0) {
      return NextResponse.json({ error: '데이터가 없습니다' }, { status: 400 })
    }

    // 컬럼명 정규화 (다양한 은행 형식 지원)
    const COL_ALIASES: Record<string, string[]> = {
      date: ['일자', '거래일', '거래일시', '날짜', 'date'],
      description: ['적요', '내용', '거래내역', '거래적요', '메모', 'description'],
      deposit: ['입금액', '입금', '입금(원)', 'deposit', '입금금액'],
      withdrawal: ['출금액', '출금', '출금(원)', 'withdrawal', '출금금액'],
      balance: ['잔액', '잔액(원)', 'balance'],
    }

    function findCol(row: Record<string, unknown>, aliases: string[]): string {
      const keys = Object.keys(row)
      for (const alias of aliases) {
        const found = keys.find((k) => k.trim().toLowerCase() === alias.toLowerCase())
        if (found) return found
      }
      return ''
    }

    const firstRow = rawRows[0]
    const colMap = Object.fromEntries(
      Object.entries(COL_ALIASES).map(([field, aliases]) => [field, findCol(firstRow, aliases)])
    )

    const records: {
      company_id: string
      date: string
      type: string
      amount: number
      description: string
    }[] = []

    for (const row of rawRows) {
      const rawDate = row[colMap.date]
      let dateStr = ''
      if (rawDate instanceof Date) {
        dateStr = rawDate.toISOString().slice(0, 10)
      } else if (typeof rawDate === 'string') {
        dateStr = rawDate.replace(/\./g, '-').replace(/\//g, '-').slice(0, 10)
      } else if (typeof rawDate === 'number') {
        const d = XLSX.SSF.parse_date_code(rawDate)
        dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
      }

      if (!dateStr || !dateStr.startsWith(ym)) continue

      const deposit = parseFloat(String(row[colMap.deposit] ?? '0').replace(/,/g, '')) || 0
      const withdrawal = parseFloat(String(row[colMap.withdrawal] ?? '0').replace(/,/g, '')) || 0
      const description = String(row[colMap.description] ?? '').trim()

      if (deposit > 0) {
        records.push({ company_id, date: dateStr, type: '입금', amount: deposit, description })
      }
      if (withdrawal > 0) {
        records.push({ company_id, date: dateStr, type: '출금', amount: withdrawal, description })
      }
    }

    if (records.length === 0) {
      return NextResponse.json({ error: `${ym} 해당 데이터가 없습니다` }, { status: 400 })
    }

    const supabase = createServerClient()
    // 기존 데이터 삭제 후 재삽입
    await supabase
      .from('bank_transactions')
      .delete()
      .eq('company_id', company_id)
      .gte('date', `${ym}-01`)
      .lte('date', `${ym}-31`)

    const { error } = await supabase.from('bank_transactions').insert(records)
    if (error) throw new Error(error.message)

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
