-- 자체 users 테이블 (Supabase auth 미사용)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 기본 관리자 계정 (비밀번호: Admin1234! → bcrypt 해시)
-- 실제 운영 시 아래 INSERT를 원하는 이메일/해시로 교체하세요
-- 해시 생성: https://bcrypt-generator.com (rounds=10)
INSERT INTO users (email, password_hash, name, role, company_id)
VALUES (
  'admin@letus.co.kr',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 비밀번호: password (테스트용)
  '관리자',
  'admin',
  NULL
) ON CONFLICT (email) DO NOTHING;
