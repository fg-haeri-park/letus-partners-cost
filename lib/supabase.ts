import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

// 클라이언트용 (브라우저)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 서버용 (API Route) — service role 키 또는 anon 키 fallback
export function createServerClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: { id: string; name: string; code: string; created_at: string }
        Insert: { id?: string; name: string; code: string }
        Update: { name?: string; code?: string }
      }
      centers: {
        Row: { id: string; company_id: string; name: string; type: string; created_at: string }
        Insert: { id?: string; company_id: string; name: string; type: string }
        Update: { name?: string; type?: string }
      }
      accounts: {
        Row: { id: string; company_id: string | null; category: string; name: string; sort_order: number; created_at: string }
        Insert: { id?: string; company_id?: string; category: string; name: string; sort_order?: number }
        Update: { category?: string; name?: string; sort_order?: number }
      }
      bank_transactions: {
        Row: { id: string; company_id: string; center_id: string | null; date: string; type: string; amount: number; description: string; account_id: string | null; memo: string | null; created_at: string }
        Insert: { id?: string; company_id: string; center_id?: string; date: string; type: string; amount: number; description: string; account_id?: string; memo?: string }
        Update: { account_id?: string; memo?: string }
      }
      invoices: {
        Row: { id: string; company_id: string; direction: string; issue_date: string; supplier: string; amount: number; tax: number; item: string | null; created_at: string }
        Insert: { id?: string; company_id: string; direction: string; issue_date: string; supplier: string; amount: number; tax: number; item?: string }
        Update: { account_id?: string }
      }
      card_purchases: {
        Row: { id: string; company_id: string; used_at: string; amount: number; merchant: string; card_number: string | null; account_id: string | null; created_at: string }
        Insert: { id?: string; company_id: string; used_at: string; amount: number; merchant: string; card_number?: string; account_id?: string }
        Update: { account_id?: string }
      }
      salaries: {
        Row: { id: string; company_id: string; center_id: string | null; employee_name: string; job_type: string; ym: string; base_pay: number; allowance: number; deduction: number; net_pay: number; created_at: string }
        Insert: { id?: string; company_id: string; center_id?: string; employee_name: string; job_type: string; ym: string; base_pay: number; allowance: number; deduction: number; net_pay: number }
        Update: {}
      }
      personal_unpaid: {
        Row: { id: string; company_id: string; employee_name: string; date: string; item: string; amount: number; note: string | null; created_at: string }
        Insert: { id?: string; company_id: string; employee_name: string; date: string; item: string; amount: number; note?: string }
        Update: {}
      }
      monthly_summary: {
        Row: { id: string; company_id: string; center_id: string | null; ym: string; account_id: string; amount: number; created_at: string }
        Insert: { id?: string; company_id: string; center_id?: string; ym: string; account_id: string; amount: number }
        Update: { amount?: number }
      }
      cash_flow_daily: {
        Row: { id: string; company_id: string; ym: string; category: string; label: string; amount: number; sort_order: number; created_at: string }
        Insert: { id?: string; company_id: string; ym: string; category: string; label: string; amount: number; sort_order?: number }
        Update: { amount?: number }
      }
    }
  }
}
