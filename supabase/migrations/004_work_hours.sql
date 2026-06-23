-- 월별 근무시간 집계 테이블
CREATE TABLE IF NOT EXISTS monthly_work_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ym TEXT NOT NULL,
  total_hours NUMERIC(10,2) DEFAULT 0,
  weighted_hours NUMERIC(10,2) DEFAULT 0,
  headcount INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, ym)
);
