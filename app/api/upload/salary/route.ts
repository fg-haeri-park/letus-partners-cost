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
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const records: {
      company_id: string
      employee_name: string
      job_type: string
      ym: string
      base_pay: number
      allowance: number
      deduction: number
      net_pay: number
    }[] = []

    for (const row of rawRows) {
      const employee_name = String(row['성명'] ?? row['이름'] ?? '').trim()
      if (!employee_name) continue

      const job_type = String(row['직군'] ?? row['구분'] ?? '현장').trim()
      const base_pay = parseFloat(String(row['기본급'] ?? '0').replace(/,/g, '')) || 0
      const allowance = parseFloat(String(row['수당'] ?? row['제수당'] ?? '0').replace(/,/g, '')) || 0
      const deduction = parseFloat(String(row['공제액'] ?? row['공제'] ?? '0').replace(/,/g, '')) || 0
      const net_pay = parseFloat(String(row['실수령액'] ?? row['실지급액'] ?? row['실수령'] ?? '0').replace(/,/g, '')) || 0

      records.push({ company_id, employee_name, job_type, ym, base_pay, allowance, deduction, net_pay })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: '파싱된 데이터가 없습니다' }, { status: 400 })
    }

    const supabase = createServerClient()
    await supabase.from('salaries').delete().eq('company_id', company_id).eq('ym', ym)
    const { error } = await supabase.from('salaries').insert(records)
    if (error) throw new Error(error.message)

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
