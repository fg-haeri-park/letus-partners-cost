-- 월별 근무시간 집계 테이블
CREATE TABLE monthly_work_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ym TEXT NOT NULL,                        -- '2026-01'
  total_hours NUMERIC(10,2) DEFAULT 0,     -- 기존합계 (실근무시간)
  weighted_hours NUMERIC(10,2) DEFAULT 0,  -- 가산합계 (OT 가중치 적용 시간)
  headcount INTEGER,                       -- 인원수
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, ym)
);

ALTER TABLE monthly_work_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_work_hours" ON monthly_work_hours FOR SELECT
  USING (check_company_access(company_id));

CREATE POLICY "admin_write_work_hours" ON monthly_work_hours FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
