import { NextRequest, NextResponse } from 'next/server'
import * as xlsx from 'xlsx'
import { createServerClient } from '@/lib/supabase'

// 시트명 → 회사 코드 매핑
const SHEET_TO_COMPANY: Record<string, string> = {
  '바로서비스': 'BARO',
  '에프스토리': 'FSTORY',
  '하나물류(용인)': 'HANA',
  '하나물류(안성평택)': 'HANA',
}

function parseMonth(label: string, year: string): string | null {
  // "1월" → "2026-01"
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

    const supabase = createServerClient()

    // 회사 목록 조회
    const { data: companies } = await supabase.from('companies').select('id, code')
    const codeToId: Record<string, string> = {}
    for (const c of companies ?? []) codeToId[c.code] = c.id

    // 월별 × 회사별 집계 맵
    type Aggregated = { total_hours: number; weighted_hours: number; headcount: number }
    const aggMap: Record<string, Record<string, Aggregated>> = {}
    // key = ym, value = { companyId: { ... } }

    for (const sheetName of wb.SheetNames) {
      const companyCode = SHEET_TO_COMPANY[sheetName]
      if (!companyCode) continue
      const companyId = codeToId[companyCode]
      if (!companyId) continue

      const ws = wb.Sheets[sheetName]
      const rows = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]

      for (const row of rows) {
        const arr = row as unknown[]
        const monthLabel = String(arr[0] ?? '')
        const saNo = String(arr[1] ?? '')

        // 합계 행만 처리 (사번 컬럼에 "합계" 포함)
        if (!saNo.includes('합계')) continue

        const ym = parseMonth(monthLabel, year)
        if (!ym) continue

        const totalHours = Number(arr[15]) || 0   // 기존합계
        const weightedHours = Number(arr[21]) || 0 // 가산합계

        // 인원수 추출 (합계 행의 근무일수 컬럼에 인원이 들어있는 경우도 있음)
        // 여기서는 집계 시 별도 추적하지 않고 0으로 처리 (나중에 보완 가능)

        if (!aggMap[ym]) aggMap[ym] = {}
        if (!aggMap[ym][companyId]) {
          aggMap[ym][companyId] = { total_hours: 0, weighted_hours: 0, headcount: 0 }
        }
        aggMap[ym][companyId].total_hours += totalHours
        aggMap[ym][companyId].weighted_hours += weightedHours
      }
    }

    // upsert
    const upsertRows = []
    for (const [ym, compMap] of Object.entries(aggMap)) {
      for (const [companyId, vals] of Object.entries(compMap)) {
        upsertRows.push({
          company_id: companyId,
          ym,
          total_hours: Math.round(vals.total_hours * 100) / 100,
          weighted_hours: Math.round(vals.weighted_hours * 100) / 100,
        })
      }
    }

    if (upsertRows.length > 0) {
      const { error } = await supabase
        .from('monthly_work_hours')
        .upsert(upsertRows, { onConflict: 'company_id,ym' })
      if (error) throw error
    }

    return NextResponse.json({ ok: true, count: upsertRows.length, months: Object.keys(aggMap).sort() })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '처리 오류' }, { status: 500 })
  }
}
