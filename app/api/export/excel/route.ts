import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const company_id = searchParams.get('company_id')
  const ym = searchParams.get('ym')

  if (!type || !company_id || !ym) {
    return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })
  }

  const supabase = createServerClient()
  const wb = new ExcelJS.Workbook()

  if (type === 'bank') {
    const { data: company } = await supabase.from('companies').select('name').eq('id', company_id).single()
    const { data: rows } = await supabase
      .from('bank_transactions')
      .select('*, accounts(name)')
      .eq('company_id', company_id)
      .gte('date', `${ym}-01`)
      .lte('date', `${ym}-31`)
      .order('date')

    const ws = wb.addWorksheet('통장내역')
    ws.columns = [
      { header: '일자', key: 'date', width: 14 },
      { header: '구분', key: 'type', width: 8 },
      { header: '금액', key: 'amount', width: 16 },
      { header: '적요', key: 'description', width: 40 },
      { header: '계정과목', key: 'account', width: 20 },
      { header: '메모', key: 'memo', width: 20 },
    ]

    // 헤더 스타일
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }

    for (const row of rows ?? []) {
      ws.addRow({
        date: row.date,
        type: row.type,
        amount: row.type === '입금' ? row.amount : -row.amount,
        description: row.description,
        account: (row.accounts as { name: string } | null)?.name ?? '',
        memo: row.memo ?? '',
      })
    }

    // 금액 열 숫자 서식
    ws.getColumn('amount').numFmt = '#,##0'

    const [year, month] = ym.split('-')
    ws.getCell('A1').value = `통장내역 — ${company?.name} ${year}년 ${Number(month)}월`
    ws.mergeCells('A1:F1')
    ws.getRow(1).height = 20
  }

  if (type === 'pl') {
    const center_id = searchParams.get('center_id')
    const { data: company } = await supabase.from('companies').select('name').eq('id', company_id).single()
    const { data: accounts } = await supabase.from('accounts').select('*').order('sort_order')
    const query = supabase
      .from('monthly_summary')
      .select('account_id, amount')
      .eq('company_id', company_id)
      .eq('ym', ym)
    if (center_id) query.eq('center_id', center_id)
    const { data: summaryRows } = await query

    const amountMap = Object.fromEntries((summaryRows ?? []).map((r) => [r.account_id, Number(r.amount)]))

    const ws = wb.addWorksheet('채산표')
    ws.columns = [
      { header: '구분', key: 'cat', width: 10 },
      { header: '계정과목', key: 'name', width: 28 },
      { header: '금액', key: 'amount', width: 18 },
    ]

    ws.getRow(1).font = { bold: true, size: 13 }

    let revenue = 0, variable_cost = 0, fixed_cost = 0

    for (const acc of accounts ?? []) {
      const amount = amountMap[acc.id] ?? 0
      if (acc.category === '매출') revenue += amount
      else if (acc.category === '변동비') variable_cost += amount
      else if (acc.category === '고정비') fixed_cost += amount

      const row = ws.addRow({ cat: acc.category, name: acc.name, amount })
      row.getCell('amount').numFmt = '#,##0'
    }

    const addSummaryRow = (label: string, value: number) => {
      const r = ws.addRow({ cat: '', name: label, amount: value })
      r.font = { bold: true }
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDAE8FC' } }
      r.getCell('amount').numFmt = '#,##0'
    }

    addSummaryRow('공헌이익 (①-②)', revenue - variable_cost)
    addSummaryRow('영업이익 (③-④)', revenue - variable_cost - fixed_cost)

    ws.getCell('A1').value = `채산표 — ${company?.name} ${ym}`
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}_${ym}.xlsx"`,
    },
  })
}
