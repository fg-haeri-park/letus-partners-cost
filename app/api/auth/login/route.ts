import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호를 입력하세요' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, company_id, password_hash')
      .eq('email', email)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.company_id ?? null,
    }

    return NextResponse.json({ user: authUser })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 })
  }
}
