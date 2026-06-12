-- LETUS 협력사 통합 재무관리 시스템 DB 스키마

-- 업체(법인)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 센터
CREATE TABLE centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('현장', '사무', '통합')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 계정과목
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('매출', '변동비', '고정비')),
  sub_category TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 통장내역
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  center_id UUID REFERENCES centers(id),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('입금', '출금')),
  amount NUMERIC(15,0) NOT NULL,
  description TEXT NOT NULL,
  account_id UUID REFERENCES accounts(id),
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 세금계산서
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  direction TEXT NOT NULL CHECK (direction IN ('매출', '매입')),
  issue_date DATE NOT NULL,
  supplier TEXT NOT NULL,
  amount NUMERIC(15,0) NOT NULL,
  tax NUMERIC(15,0) NOT NULL,
  item TEXT,
  account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 카드매입
CREATE TABLE card_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  used_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(15,0) NOT NULL,
  merchant TEXT NOT NULL,
  card_number TEXT,
  account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 급여
CREATE TABLE salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  center_id UUID REFERENCES centers(id),
  employee_name TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('사무', '현장', '지원')),
  ym CHAR(7) NOT NULL,
  base_pay NUMERIC(15,0) DEFAULT 0,
  allowance NUMERIC(15,0) DEFAULT 0,
  deduction NUMERIC(15,0) DEFAULT 0,
  net_pay NUMERIC(15,0) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 개인미지급금
CREATE TABLE personal_unpaid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_name TEXT NOT NULL,
  date DATE NOT NULL,
  item TEXT NOT NULL,
  amount NUMERIC(15,0) NOT NULL,
  note TEXT,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 월별 요약(채산표)
CREATE TABLE monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  center_id UUID REFERENCES centers(id),
  ym CHAR(7) NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(15,0) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, center_id, ym, account_id)
);

-- 자금일보
CREATE TABLE cash_flow_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  ym CHAR(7) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('이월', '입금', '출금')),
  label TEXT NOT NULL,
  amount NUMERIC(15,0) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 기본 데이터 삽입
INSERT INTO companies (name, code) VALUES
  ('바로서비스', 'BARO'),
  ('에프스토리', 'FSTORY'),
  ('하나물류', 'HANA');

-- 바로서비스 센터
INSERT INTO centers (company_id, name, type)
SELECT id, '양지센터', '현장' FROM companies WHERE code = 'BARO';

-- 에프스토리 센터
INSERT INTO centers (company_id, name, type)
SELECT id, '양지센터(현장)', '현장' FROM companies WHERE code = 'FSTORY';
INSERT INTO centers (company_id, name, type)
SELECT id, '양지센터(사무)', '사무' FROM companies WHERE code = 'FSTORY';

-- 하나물류 센터
INSERT INTO centers (company_id, name, type)
SELECT id, '양지1센터', '현장' FROM companies WHERE code = 'HANA';
INSERT INTO centers (company_id, name, type)
SELECT id, '양지3센터', '현장' FROM companies WHERE code = 'HANA';
INSERT INTO centers (company_id, name, type)
SELECT id, '안성센터', '현장' FROM companies WHERE code = 'HANA';
INSERT INTO centers (company_id, name, type)
SELECT id, '평택센터', '현장' FROM companies WHERE code = 'HANA';

-- 공통 계정과목
INSERT INTO accounts (company_id, category, sub_category, name, sort_order) VALUES
  (NULL, '매출', '용역수입', '용역매출', 1),
  (NULL, '매출', '용역수입', '추가용역료', 2),
  (NULL, '변동비', '인건비', '직원급여', 10),
  (NULL, '변동비', '인건비', '상여금', 11),
  (NULL, '변동비', '인건비', '퇴직급여', 12),
  (NULL, '변동비', '인건비', '외주용역비', 13),
  (NULL, '고정비', '복리후생', '복리후생비', 20),
  (NULL, '고정비', '복리후생', '식대(전자식권)', 21),
  (NULL, '고정비', '업무비', '여비교통비', 30),
  (NULL, '고정비', '업무비', '교육훈련비', 31),
  (NULL, '고정비', '업무비', '소모품비', 32),
  (NULL, '고정비', '세금·보험', '세금과공과금', 40),
  (NULL, '고정비', '세금·보험', '4대보험(건강)', 41),
  (NULL, '고정비', '세금·보험', '4대보험(연금)', 42),
  (NULL, '고정비', '세금·보험', '4대보험(고용)', 43),
  (NULL, '고정비', '세금·보험', '4대보험(산재)', 44),
  (NULL, '고정비', '세금·보험', '근로소득세', 45),
  (NULL, '고정비', '시설', '임차료', 50),
  (NULL, '고정비', '시설', '보험료', 51),
  (NULL, '고정비', '시설', '수선비', 52),
  (NULL, '고정비', '시설', '하자보수비', 53),
  (NULL, '고정비', '수수료', '수수료비용', 60),
  (NULL, '고정비', '수수료', '노무자문수수료', 61),
  (NULL, '고정비', '수수료', '기장료', 62),
  (NULL, '고정비', '기타', '기타', 99);

-- RLS 활성화
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_unpaid ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_daily ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모든 데이터 접근 허용 (추후 법인별 권한 분리 가능)
CREATE POLICY "authenticated_all" ON companies FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON centers FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON accounts FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON bank_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON card_purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON salaries FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON personal_unpaid FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON monthly_summary FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON cash_flow_daily FOR ALL TO authenticated USING (true);
