// PostgreSQL 직접 연결 모드
// 서버(API Route): lib/db.ts 의 query() 사용
// 클라이언트 컴포넌트: /api/data/* 엔드포인트 fetch() 사용

// 클라이언트 페이지에서 import { supabase } from '@/lib/supabase' 하는 코드와의
// 호환성을 위해 빈 더미 객체를 export (실제 호출 시 오류 → 추후 각 페이지를 fetch()로 교체)
export const supabase = {
  from: () => { throw new Error('supabase 클라이언트 사용 불가: /api/data/* 사용하세요') },
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({}),
    signInWithPassword: async () => ({ error: new Error('직접 로그인 사용') }),
  },
} as const

export function createServerClient() {
  throw new Error('createServerClient 사용 불가: lib/db.ts 의 query() 사용하세요')
}

export type Database = {
  public: {
    Tables: {
      companies: { Row: { id: string; name: string; code: string; created_at: string } }
      centers: { Row: { id: string; company_id: string; name: string; type: string; created_at: string } }
      accounts: { Row: { id: string; company_id: string | null; category: string; sub_category: string; name: string; sort_order: number; created_at: string } }
      bank_transactions: { Row: { id: string; company_id: string; center_id: string | null; date: string; type: string; amount: number; description: string; account_id: string | null; memo: string | null; is_bulk: boolean; created_at: string } }
      invoices: { Row: { id: string; company_id: string; direction: string; issue_date: string; supplier: string; amount: number; tax: number; item: string | null; created_at: string } }
      card_purchases: { Row: { id: string; company_id: string; used_at: string; amount: number; merchant: string; card_number: string | null; account_id: string | null; created_at: string } }
      salaries: { Row: { id: string; company_id: string; center_id: string | null; employee_name: string; job_type: string; ym: string; base_pay: number; allowance: number; deduction: number; net_pay: number; created_at: string } }
      personal_unpaid: { Row: { id: string; company_id: string; employee_name: string; date: string; item: string; amount: number; note: string | null; is_paid: boolean; created_at: string } }
      monthly_summary: { Row: { id: string; company_id: string; center_id: string | null; ym: string; account_id: string; amount: number; created_at: string } }
      cash_flow_daily: { Row: { id: string; company_id: string; ym: string; category: string; label: string; amount: number; sort_order: number; created_at: string } }
      monthly_work_hours: { Row: { id: string; company_id: string; ym: string; total_hours: number; weighted_hours: number; headcount: number | null; created_at: string } }
    }
  }
}
