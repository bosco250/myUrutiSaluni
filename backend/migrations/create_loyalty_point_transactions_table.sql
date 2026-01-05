-- Create loyalty_point_transactions table
CREATE TABLE IF NOT EXISTS loyalty_point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('sale', 'appointment', 'redemption', 'manual', 'bonus', 'correction')),
  source_id UUID,
  description TEXT,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_point_transactions(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_source ON loyalty_point_transactions(source_type, source_id);

-- Add comment
COMMENT ON TABLE loyalty_point_transactions IS 'Tracks all loyalty points earning and redemption transactions';
COMMENT ON COLUMN loyalty_point_transactions.points IS 'Positive for earned, negative for redeemed';
COMMENT ON COLUMN loyalty_point_transactions.balance_after IS 'Customer balance after this transaction';

