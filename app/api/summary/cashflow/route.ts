import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { company_id, ym } = await req.json()
    if (!company_id || !ym) return NextResponse.json({ error: '파라미터 누락' }, { status: 400 })

    const supabase = createServerClient()

    // 기존 데이터 삭제
    await supabase.from('cash_flow_daily').delete().eq('company_id', company_id).eq('ym', ym)

    // 통장 입금 집계
    const { data: bankIn } = await supabase
      .from('bank_transactions')
      .select('amount, description, accounts(name, category)')
      .eq('company_id', company_id)
      .eq('type', '입금')
      .gte('date', `${ym}-01`)
      .lte('date', `${ym}-31`)

    // 통장 출금 집계
    const { data: bankOut } = await supabase
      .from('bank_transactions')
      .select('amount, description, accounts(name, category)')
      .eq('company_id', company_id)
      .eq('type', '출금')
      .gte('date', `${ym}-01`)
      .lte('date', `${ym}-31`)

    // 급여 합계
    const { data: salaries } = await supabase
      .from('salaries')
      .select('net_pay, job_type')
      .eq('company_id', company_id)
      .eq('ym', ym)

    // 카드매입 합계
    const { data: cards } = await supabase
      .from('card_purchases')
      .select('amount')
      .eq('company_id', company_id)
      .gte('used_at', `${ym}-01`)
      .lte('used_at', `${ym}-31`)

    const records: {
      company_id: string
      ym: string
      category: string
      label: string
      amount: number
      sort_order: number
    }[] = []

    // 이월 (0으로 초기화 — 사용자가 직접 입력)
    records.push({ company_id, ym, category: '이월', label: '전월 이월금액', amount: 0, sort_order: 0 })

    // 입금 항목 (통장 입금)
    const inGroups: Record<string, number> = {}
    for (const row of bankIn ?? []) {
      const label = (row.accounts as unknown as { name: string } | null)?.name ?? '기타입금'
      inGroups[label] = (inGroups[label] ?? 0) + Number(row.amount)
    }
    let inOrder = 10
    for (const [label, amount] of Object.entries(inGroups)) {
      records.push({ company_id, ym, category: '입금', label, amount, sort_order: inOrder++ })
    }

    // 출금 항목 (급여)
    const salaryByType: Record<string, number> = {}
    for (const s of salaries ?? []) {
      salaryByType[s.job_type] = (salaryByType[s.job_type] ?? 0) + Number(s.net_pay)
    }
    let outOrder = 20
    for (const [jt, amt] of Object.entries(salaryByType)) {
      records.push({ company_id, ym, category: '출금', label: `급여(${jt})`, amount: amt, sort_order: outOrder++ })
    }

    // 카드
    const cardTotal = (cards ?? []).reduce((s, r) => s + Number(r.amount), 0)
    if (cardTotal > 0) {
      records.push({ company_id, ym, category: '출금', label: '법인카드', amount: cardTotal, sort_order: outOrder++ })
    }

    // 통장 출금 중 급여 외 항목
    const outGroups: Record<string, number> = {}
    for (const row of bankOut ?? []) {
      const label = (row.accounts as unknown as { name: string } | null)?.name ?? '기타출금'
      if (label.includes('급여')) continue
      outGroups[label] = (outGroups[label] ?? 0) + Number(row.amount)
    }
    for (const [label, amount] of Object.entries(outGroups)) {
      records.push({ company_id, ym, category: '출금', label, amount, sort_order: outOrder++ })
    }

    const { error } = await supabase.from('cash_flow_daily').insert(records)
    if (error) throw new Error(error.message)

    return NextResponse.json({ count: records.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류 발생' }, { status: 500 })
  }
}
