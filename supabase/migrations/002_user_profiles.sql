-- 사용자 프로필 및 역할 관리
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,  -- NULL = 전체 법인 접근
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필 조회 가능
CREATE POLICY "users_read_own_profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자만 모든 프로필 조회 가능
CREATE POLICY "admin_read_all_profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자만 프로필 등록/수정 가능
CREATE POLICY "admin_manage_profiles"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자 전용 테이블 RLS 정책 (salaries, personal_unpaid)
-- salaries: 관리자만 접근
DROP POLICY IF EXISTS "authenticated_all" ON salaries;
CREATE POLICY "admin_only_salaries"
  ON salaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- personal_unpaid: 관리자만 접근
DROP POLICY IF EXISTS "authenticated_all" ON personal_unpaid;
CREATE POLICY "admin_only_personal_unpaid"
  ON personal_unpaid FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 법인 접근 체크 헬퍼: company_id가 null이면 전체 허용, 값이 있으면 해당 법인만
-- 사용법: check_company_access(row.company_id)
CREATE OR REPLACE FUNCTION check_company_access(row_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (company_id IS NULL OR company_id = row_company_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 나머지 테이블: 인증된 사용자는 소속 법인 데이터 조회 가능, 수정은 관리자만
-- bank_transactions
DROP POLICY IF EXISTS "authenticated_all" ON bank_transactions;
CREATE POLICY "auth_read_bank" ON bank_transactions FOR SELECT
  USING (check_company_access(company_id));
CREATE POLICY "admin_write_bank" ON bank_transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_update_bank" ON bank_transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_delete_bank" ON bank_transactions FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- monthly_summary
DROP POLICY IF EXISTS "authenticated_all" ON monthly_summary;
CREATE POLICY "auth_read_summary" ON monthly_summary FOR SELECT
  USING (check_company_access(company_id));
CREATE POLICY "admin_write_summary" ON monthly_summary FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- invoices
DROP POLICY IF EXISTS "authenticated_all" ON invoices;
CREATE POLICY "auth_read_invoices" ON invoices FOR SELECT
  USING (check_company_access(company_id));
CREATE POLICY "admin_write_invoices" ON invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- card_purchases
DROP POLICY IF EXISTS "authenticated_all" ON card_purchases;
CREATE POLICY "auth_read_cards" ON card_purchases FOR SELECT
  USING (check_company_access(company_id));
CREATE POLICY "admin_write_cards" ON card_purchases FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- cash_flow_daily
DROP POLICY IF EXISTS "authenticated_all" ON cash_flow_daily;
CREATE POLICY "auth_read_cashflow" ON cash_flow_daily FOR SELECT
  USING (check_company_access(company_id));
CREATE POLICY "admin_write_cashflow" ON cash_flow_daily FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
