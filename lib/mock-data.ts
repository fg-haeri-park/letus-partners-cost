export const MOCK_COMPANIES = [
  { id: 'baro-001', name: '바로서비스', code: 'BARO', created_at: '' },
  { id: 'fstory-001', name: '에프스토리', code: 'FSTORY', created_at: '' },
  { id: 'hana-001', name: '하나물류', code: 'HANA', created_at: '' },
]

export const MOCK_CENTERS = [
  { id: 'center-001', company_id: 'baro-001', name: '양지센터', type: '현장', created_at: '' },
  { id: 'center-002', company_id: 'fstory-001', name: '양지센터(현장)', type: '현장', created_at: '' },
  { id: 'center-003', company_id: 'fstory-001', name: '양지센터(사무)', type: '사무', created_at: '' },
  { id: 'center-004', company_id: 'hana-001', name: '양지1센터', type: '현장', created_at: '' },
  { id: 'center-005', company_id: 'hana-001', name: '양지3센터', type: '현장', created_at: '' },
  { id: 'center-006', company_id: 'hana-001', name: '안성센터', type: '현장', created_at: '' },
  { id: 'center-007', company_id: 'hana-001', name: '평택센터', type: '현장', created_at: '' },
]

export const MOCK_ACCOUNTS = [
  { id: 'acc-01', company_id: null, category: '매출', sub_category: '용역수입', name: '용역매출', sort_order: 1 },
  { id: 'acc-02', company_id: null, category: '매출', sub_category: '용역수입', name: '추가용역료', sort_order: 2 },
  { id: 'acc-03', company_id: null, category: '변동비', sub_category: '인건비', name: '직원급여', sort_order: 10 },
  { id: 'acc-04', company_id: null, category: '변동비', sub_category: '인건비', name: '상여금', sort_order: 11 },
  { id: 'acc-05', company_id: null, category: '변동비', sub_category: '인건비', name: '퇴직급여', sort_order: 12 },
  { id: 'acc-06', company_id: null, category: '변동비', sub_category: '인건비', name: '외주용역비', sort_order: 13 },
  { id: 'acc-07', company_id: null, category: '고정비', sub_category: '복리후생', name: '복리후생비', sort_order: 20 },
  { id: 'acc-08', company_id: null, category: '고정비', sub_category: '복리후생', name: '식대(전자식권)', sort_order: 21 },
  { id: 'acc-09', company_id: null, category: '고정비', sub_category: '업무비', name: '여비교통비', sort_order: 30 },
  { id: 'acc-10', company_id: null, category: '고정비', sub_category: '업무비', name: '소모품비', sort_order: 32 },
  { id: 'acc-11', company_id: null, category: '고정비', sub_category: '세금·보험', name: '세금과공과금', sort_order: 40 },
  { id: 'acc-12', company_id: null, category: '고정비', sub_category: '세금·보험', name: '4대보험(건강)', sort_order: 41 },
  { id: 'acc-13', company_id: null, category: '고정비', sub_category: '세금·보험', name: '근로소득세', sort_order: 45 },
  { id: 'acc-14', company_id: null, category: '고정비', sub_category: '시설', name: '임차료', sort_order: 50 },
  { id: 'acc-15', company_id: null, category: '고정비', sub_category: '수수료', name: '수수료비용', sort_order: 60 },
  { id: 'acc-16', company_id: null, category: '고정비', sub_category: '기타', name: '기타', sort_order: 99 },
]

export const MOCK_MONTHLY_SUMMARY: Record<string, Record<string, number>> = {
  'baro-001': {
    'acc-01': 85000000,
    'acc-02': 3200000,
    'acc-03': 42000000,
    'acc-04': 1500000,
    'acc-05': 2100000,
    'acc-06': 800000,
    'acc-07': 1200000,
    'acc-08': 950000,
    'acc-09': 320000,
    'acc-10': 180000,
    'acc-11': 450000,
    'acc-12': 3800000,
    'acc-13': 1200000,
    'acc-14': 2500000,
    'acc-15': 300000,
    'acc-16': 150000,
  },
  'fstory-001': {
    'acc-01': 120000000,
    'acc-02': 5000000,
    'acc-03': 65000000,
    'acc-04': 3000000,
    'acc-05': 3500000,
    'acc-06': 2000000,
    'acc-07': 2000000,
    'acc-08': 1800000,
    'acc-09': 500000,
    'acc-10': 350000,
    'acc-11': 700000,
    'acc-12': 5500000,
    'acc-13': 1800000,
    'acc-14': 3500000,
    'acc-15': 500000,
    'acc-16': 200000,
  },
  'hana-001': {
    'acc-01': 210000000,
    'acc-02': 8000000,
    'acc-03': 115000000,
    'acc-04': 5000000,
    'acc-05': 6000000,
    'acc-06': 4000000,
    'acc-07': 3500000,
    'acc-08': 3200000,
    'acc-09': 800000,
    'acc-10': 600000,
    'acc-11': 1200000,
    'acc-12': 9500000,
    'acc-13': 3200000,
    'acc-14': 6000000,
    'acc-15': 800000,
    'acc-16': 400000,
  },
}

export const MOCK_BANK_TRANSACTIONS = [
  { id: 'bt-01', date: '2026-06-03', type: '입금',  amount: 85000000, description: '바로서비스 용역료',    account_id: 'acc-01', memo: '', accounts: { name: '용역매출' },       is_bulk: false },
  { id: 'bt-02', date: '2026-06-05', type: '출금',  amount: 44200000, description: '대량이체',             account_id: null,     memo: '급여/보험 일괄지급', accounts: null, is_bulk: true  },
  { id: 'bt-03', date: '2026-06-10', type: '출금',  amount: 5000000,  description: '대량이체',             account_id: null,     memo: '세금/공과금',         accounts: null, is_bulk: true  },
  { id: 'bt-04', date: '2026-06-15', type: '입금',  amount: 3200000,  description: '추가용역료 수령',      account_id: 'acc-02', memo: '', accounts: { name: '추가용역료' },    is_bulk: false },
  { id: 'bt-05', date: '2026-06-20', type: '출금',  amount: 2500000,  description: '임차료 납부',          account_id: 'acc-14', memo: '', accounts: { name: '임차료' },         is_bulk: false },
  { id: 'bt-06', date: '2026-06-25', type: '출금',  amount: 2450000,  description: '대량이체',             account_id: null,     memo: '복리후생비 일괄',     accounts: null, is_bulk: true  },
]

// 대량이체 상세내역 (transaction_id → 내역 목록)
export const MOCK_TRANSACTION_DETAILS: Record<string, {
  id: string; transaction_id: string; description: string; amount: number; account_id: string | null; note: string | null
}[]> = {
  'bt-02': [
    { id: 'td-01', transaction_id: 'bt-02', description: '현장직원 급여',    amount: 38200000, account_id: 'acc-03', note: '18명' },
    { id: 'td-02', transaction_id: 'bt-02', description: '사무직원 급여',    amount: 3050000,  account_id: 'acc-03', note: '1명' },
    { id: 'td-03', transaction_id: 'bt-02', description: '4대보험(건강) 납부', amount: 2950000, account_id: 'acc-12', note: '' },
  ],
  'bt-03': [
    { id: 'td-04', transaction_id: 'bt-03', description: '근로소득세',       amount: 1200000,  account_id: 'acc-13', note: '원천징수' },
    { id: 'td-05', transaction_id: 'bt-03', description: '세금과공과금',     amount: 450000,   account_id: 'acc-11', note: '' },
    { id: 'td-06', transaction_id: 'bt-03', description: '기타 공과금',      amount: 3350000,  account_id: 'acc-16', note: '' },
  ],
  'bt-06': [],
}

export const MOCK_INVOICES = [
  { id: 'inv-01', direction: '매출', issue_date: '2026-06-01', supplier: '(주)ABC물류', amount: 85000000, tax: 8500000, item: '물류대행 용역' },
  { id: 'inv-02', direction: '매출', issue_date: '2026-06-15', supplier: '(주)ABC물류', amount: 3200000, tax: 320000, item: '추가용역' },
  { id: 'inv-03', direction: '매입', issue_date: '2026-06-05', supplier: '(주)유니폼', amount: 450000, tax: 45000, item: '작업복' },
  { id: 'inv-04', direction: '매입', issue_date: '2026-06-10', supplier: '(주)사무용품', amount: 180000, tax: 18000, item: '소모품' },
]

export const MOCK_CARD_PURCHASES = [
  { id: 'card-01', used_at: '2026-06-03', amount: 85000, merchant: '이마트24 양지점', card_number: '1234', account_id: 'acc-08', accounts: { name: '식대(전자식권)' } },
  { id: 'card-02', used_at: '2026-06-05', amount: 320000, merchant: '주유소', card_number: '1234', account_id: 'acc-09', accounts: { name: '여비교통비' } },
  { id: 'card-03', used_at: '2026-06-12', amount: 150000, merchant: '문구사', card_number: '1234', account_id: 'acc-10', accounts: { name: '소모품비' } },
  { id: 'card-04', used_at: '2026-06-18', amount: 280000, merchant: '식당', card_number: '1234', account_id: null, accounts: null },
]

export const MOCK_SALARIES = [
  { id: 'sal-01', employee_name: '김현장', job_type: '현장', ym: '2026-06', base_pay: 2800000, allowance: 200000, deduction: 350000, net_pay: 2650000, centers: null },
  { id: 'sal-02', employee_name: '이현장', job_type: '현장', ym: '2026-06', base_pay: 2600000, allowance: 150000, deduction: 320000, net_pay: 2430000, centers: null },
  { id: 'sal-03', employee_name: '박현장', job_type: '현장', ym: '2026-06', base_pay: 2700000, allowance: 180000, deduction: 340000, net_pay: 2540000, centers: null },
  { id: 'sal-04', employee_name: '최관리', job_type: '사무', ym: '2026-06', base_pay: 3200000, allowance: 300000, deduction: 450000, net_pay: 3050000, centers: null },
]

export const MOCK_PERSONAL_UNPAID = [
  { id: 'pu-01', employee_name: '김현장', date: '2026-06-01', item: '교통비 선지급', amount: 50000, note: '출장', is_paid: false },
  { id: 'pu-02', employee_name: '이현장', date: '2026-06-05', item: '작업도구 구입', amount: 85000, note: '', is_paid: false },
  { id: 'pu-03', employee_name: '박현장', date: '2026-05-20', item: '식대', amount: 30000, note: '', is_paid: true },
]

export const MOCK_CASH_FLOW = [
  { id: 'cf-01', category: '이월', label: '전월 이월금액', amount: 45000000, sort_order: 0 },
  { id: 'cf-02', category: '입금', label: '용역매출', amount: 85000000, sort_order: 10 },
  { id: 'cf-03', category: '입금', label: '추가용역료', amount: 3200000, sort_order: 11 },
  { id: 'cf-04', category: '출금', label: '급여(현장)', amount: 38200000, sort_order: 20 },
  { id: 'cf-05', category: '출금', label: '급여(사무)', amount: 3800000, sort_order: 21 },
  { id: 'cf-06', category: '출금', label: '법인카드', amount: 835000, sort_order: 22 },
  { id: 'cf-07', category: '출금', label: '4대보험(건강)', amount: 3800000, sort_order: 23 },
  { id: 'cf-08', category: '출금', label: '근로소득세', amount: 1200000, sort_order: 24 },
  { id: 'cf-09', category: '출금', label: '임차료', amount: 2500000, sort_order: 25 },
]

// 월별 근무시간 (근태파일 업로드 후 집계된 값)
export const MOCK_WORK_HOURS: Record<string, Record<string, { total_hours: number; weighted_hours: number; headcount: number }>> = {
  'baro-001': {
    '2026-01': { total_hours: 13886.71, weighted_hours: 16028.11, headcount: 52 },
    '2026-02': { total_hours: 11756.83, weighted_hours: 13712.91, headcount: 52 },
    '2026-03': { total_hours: 12487.22, weighted_hours: 14498.63, headcount: 53 },
    '2026-04': { total_hours: 12105.44, weighted_hours: 14012.77, headcount: 53 },
    '2026-05': { total_hours: 12804.18, weighted_hours: 14931.50, headcount: 54 },
    '2026-06': { total_hours: 13118.67, weighted_hours: 15228.43, headcount: 54 },
  },
  'fstory-001': {
    '2026-01': { total_hours: 8321.56, weighted_hours: 9209.58, headcount: 38 },
    '2026-02': { total_hours: 6887.04, weighted_hours: 7678.99, headcount: 38 },
    '2026-03': { total_hours: 8360.07, weighted_hours: 9260.10, headcount: 39 },
    '2026-04': { total_hours: 8002.33, weighted_hours: 8850.44, headcount: 39 },
    '2026-05': { total_hours: 8445.21, weighted_hours: 9348.77, headcount: 40 },
    '2026-06': { total_hours: 8632.44, weighted_hours: 9570.55, headcount: 40 },
  },
  'hana-001': {
    '2026-01': { total_hours: 8942.10, weighted_hours: 10342.95, headcount: 41 },
    '2026-02': { total_hours: 7308.72, weighted_hours: 8541.61, headcount: 41 },
    '2026-03': { total_hours: 8775.38, weighted_hours: 10183.49, headcount: 42 },
    '2026-04': { total_hours: 8412.55, weighted_hours: 9733.20, headcount: 42 },
    '2026-05': { total_hours: 8901.33, weighted_hours: 10290.88, headcount: 43 },
    '2026-06': { total_hours: 9124.66, weighted_hours: 10599.37, headcount: 43 },
  },
}

export const MOCK_MONTHLY_TREND = [
  { ym: '1월', revenue: 82000000, operating_income: 12000000 },
  { ym: '2월', revenue: 80000000, operating_income: 11500000 },
  { ym: '3월', revenue: 86000000, operating_income: 13000000 },
  { ym: '4월', revenue: 83000000, operating_income: 12500000 },
  { ym: '5월', revenue: 87000000, operating_income: 13500000 },
  { ym: '6월', revenue: 88200000, operating_income: 14100000 },
]

export const IS_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('.supabase.co') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
