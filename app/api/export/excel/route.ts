import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const company_id = searchParams.get('company_id')
  const ym = searchParams.get('ym')

  if (!type || !company_id || !ym) {
    return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })
  }

  const wb = new ExcelJS.Workbook()

  if (type === 'bank') {
    const company = await queryOne<{ name: string }>('SELECT name FROM companies WHERE id = $1', [company_id])
    const rows = await query(
      `SELECT bt.*, a.name as account_name FROM bank_transactions bt
       LEFT JOIN accounts a ON a.id = bt.account_id
       WHERE bt.company_id = $1 AND to_char(bt.date, 'YYYY-MM') = $2
       ORDER BY bt.date`,
      [company_id, ym]
    ) as Array<{ date: string; type: string; amount: number; description: string; account_name: string; memo: string }>

    const ws = wb.addWorksheet('통장내역')
    ws.columns = [
      { header: '일자', key: 'date', width: 14 },
      { header: '구분', key: 'type', width: 8 },
      { header: '금액', key: 'amount', width: 16 },
      { header: '적요', key: 'description', width: 40 },
      { header: '계정과목', key: 'account', width: 20 },
      { header: '메모', key: 'memo', width: 20 },
    ]
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }

    for (const row of rows) {
      ws.addRow({
        date: row.date,
        type: row.type,
        amount: row.type === '입금' ? row.amount : -row.amount,
        description: row.description,
        account: row.account_name ?? '',
        memo: row.memo ?? '',
      })
    }
    ws.getColumn('amount').numFmt = '#,##0'
    const [year, month] = ym.split('-')
    ws.getCell('A1').value = `통장내역 — ${company?.name} ${year}년 ${Number(month)}월`
  }

  if (type === 'pl') {
    const center_id = searchParams.get('center_id')
    const company = await queryOne<{ name: string }>('SELECT name FROM companies WHERE id = $1', [company_id])
    const accounts = await query('SELECT * FROM accounts ORDER BY sort_order') as Array<{ id: string; category: string; name: string }>

    const conditions = ['company_id = $1', 'ym = $2']
    const params: unknown[] = [company_id, ym]
    if (center_id) { conditions.push('center_id = $3'); params.push(center_id) }

    const summaryRows = await query<{ account_id: string; amount: string }>(
      `SELECT account_id, SUM(amount) as amount FROM monthly_summary WHERE ${conditions.join(' AND ')} GROUP BY account_id`,
      params
    )
    const amountMap = Object.fromEntries(summaryRows.map(r => [r.account_id, Number(r.amount)]))

    const ws = wb.addWorksheet('채산표')
    ws.columns = [
      { header: '구분', key: 'cat', width: 10 },
      { header: '계정과목', key: 'name', width: 28 },
      { header: '금액', key: 'amount', width: 18 },
    ]
    ws.getRow(1).font = { bold: true, size: 13 }

    let revenue = 0, variable_cost = 0, fixed_cost = 0
    for (const acc of accounts) {
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
