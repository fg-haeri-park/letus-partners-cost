-- 대량이체 상세내역 테이블
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS transaction_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_details_tx ON transaction_details(transaction_id);
