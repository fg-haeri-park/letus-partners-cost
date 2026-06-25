import { NextRequest, NextResponse } from 'next/server'
import * as xlsx from 'xlsx'
import { query } from '@/lib/db'

const SHEET_TO_COMPANY: Record<string, string> = {
  '바로서비스': 'BARO',
  '에프스토리': 'FSTORY',
  '하나물류(용인)': 'HANA',
  '하나물류(안성평택)': 'HANA',
}

function parseMonth(label: string, year: string): string | null {
  const m = label.match(/^(\d+)월/)
  if (!m) return null
  return `${year}-${String(Number(m[1])).padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const year = (formData.get('year') as string) || String(new Date().getFullYear())
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = xlsx.read(buffer, { type: 'buffer' })

    const companies = await query<{ id: string; code: string }>('SELECT id, code FROM companies')
    const codeToId: Record<string, string> = {}
    for (const c of companies) codeToId[c.code] = c.id

    type Agg = { total_hours: number; weighted_hours: number }
    const aggMap: Record<string, Record<string, Agg>> = {}

    for (const sheetName of wb.SheetNames) {
      const companyCode = SHEET_TO_COMPANY[sheetName]
      if (!companyCode) continue
      const companyId = codeToId[companyCode]
      if (!companyId) continue

      const ws = wb.Sheets[sheetName]
      const rows = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]

      for (const row of rows) {
        const arr = row as unknown[]
        if (!String(arr[1] ?? '').includes('합계')) continue
        const ym = parseMonth(String(arr[0] ?? ''), year)
        if (!ym) continue
        if (!aggMap[ym]) aggMap[ym] = {}
        if (!aggMap[ym][companyId]) aggMap[ym][companyId] = { total_hours: 0, weighted_hours: 0 }
        aggMap[ym][companyId].total_hours += Number(arr[15]) || 0
        aggMap[ym][companyId].weighted_hours += Number(arr[21]) || 0
      }
    }

    let count = 0
    for (const [ym, compMap] of Object.entries(aggMap)) {
      for (const [companyId, vals] of Object.entries(compMap)) {
        await query(
          `INSERT INTO monthly_work_hours (company_id, ym, total_hours, weighted_hours)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (company_id, ym) DO UPDATE
           SET total_hours = EXCLUDED.total_hours, weighted_hours = EXCLUDED.weighted_hours`,
          [companyId, ym, Math.round(vals.total_hours * 100) / 100, Math.round(vals.weighted_hours * 100) / 100]
        )
        count++
      }
    }

    return NextResponse.json({ ok: true, count, months: Object.keys(aggMap).sort() })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '처리 오류' }, { status: 500 })
  }
}
