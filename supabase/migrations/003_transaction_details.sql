-- 대량이체 상세내역 테이블
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN DEFAULT false;

CREATE TABLE transaction_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transaction_details_tx ON transaction_details(transaction_id);

ALTER TABLE transaction_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_tx_details" ON transaction_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bank_transactions bt
      WHERE bt.id = transaction_id
        AND check_company_access(bt.company_id)
    )
  );

CREATE POLICY "admin_write_tx_details" ON transaction_details FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
