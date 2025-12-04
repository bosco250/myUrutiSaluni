-- Extended Schema for Accounting, Micro-Lending, and Wallets
-- This extends the base schema with missing tables

-- -----------------------------------------
-- Accounting Module
-- -----------------------------------------

CREATE TYPE account_type_enum AS ENUM ('asset','liability','equity','revenue','expense');
CREATE TYPE journal_entry_status AS ENUM ('draft','posted','reversed');
CREATE TYPE invoice_status_enum AS ENUM ('draft','sent','paid','overdue','cancelled');

-- Chart of Accounts
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type account_type_enum NOT NULL,
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chart_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX idx_chart_accounts_salon ON chart_of_accounts(salon_id);

-- Journal Entries (Double Entry)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  entry_number VARCHAR(64) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  status journal_entry_status DEFAULT 'draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  debit_amount NUMERIC(14,2) DEFAULT 0,
  credit_amount NUMERIC(14,2) DEFAULT 0,
  description TEXT,
  reference_type VARCHAR(64), -- e.g., 'sale', 'expense', 'payment'
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journal_entries_salon ON journal_entries(salon_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  invoice_number VARCHAR(64) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'RWF',
  status invoice_status_enum DEFAULT 'draft',
  paid_amount NUMERIC(14,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_salon ON invoices(salon_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Expense Claims
CREATE TABLE expense_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES salon_employees(id) ON DELETE SET NULL,
  claim_number VARCHAR(64) UNIQUE NOT NULL,
  claim_date DATE NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'RWF',
  status VARCHAR(32) DEFAULT 'pending', -- pending, approved, rejected, paid
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expense_claim_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_claim_id UUID REFERENCES expense_claims(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------
-- Micro-Lending Module
-- -----------------------------------------

CREATE TYPE loan_status_enum AS ENUM ('draft','pending','approved','disbursed','active','completed','defaulted','cancelled');
CREATE TYPE loan_product_type AS ENUM ('working_capital','equipment','expansion','emergency');

-- Loan Products
CREATE TABLE loan_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  product_type loan_product_type,
  min_amount NUMERIC(14,2) NOT NULL,
  max_amount NUMERIC(14,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL, -- annual percentage rate
  min_term_months INTEGER NOT NULL,
  max_term_months INTEGER NOT NULL,
  requires_guarantor BOOLEAN DEFAULT false,
  eligibility_criteria JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credit Scoring
CREATE TABLE credit_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  score INTEGER NOT NULL, -- 0-1000
  risk_level VARCHAR(32), -- excellent, good, fair, poor
  factors JSONB DEFAULT '{}'::jsonb, -- scoring factors
  calculated_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_scores_user ON credit_scores(user_id);
CREATE INDEX idx_credit_scores_salon ON credit_scores(salon_id);

-- Loans
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_number VARCHAR(64) UNIQUE NOT NULL,
  loan_product_id UUID REFERENCES loan_products(id) ON DELETE RESTRICT,
  applicant_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  principal_amount NUMERIC(14,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,
  term_months INTEGER NOT NULL,
  monthly_payment NUMERIC(14,2) NOT NULL,
  total_amount_due NUMERIC(14,2) NOT NULL,
  status loan_status_enum DEFAULT 'draft',
  application_date DATE NOT NULL,
  approved_date DATE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  disbursed_date DATE,
  disbursed_amount NUMERIC(14,2),
  disbursement_method VARCHAR(32), -- wallet, mobile_money, bank
  disbursement_reference VARCHAR(255),
  first_payment_date DATE,
  next_payment_date DATE,
  completed_date DATE,
  defaulted_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Loan Guarantors
CREATE TABLE loan_guarantors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  guarantor_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  guarantee_amount NUMERIC(14,2),
  status VARCHAR(32) DEFAULT 'pending', -- pending, approved, rejected
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Loan Repayments
CREATE TABLE loan_repayments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  repayment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount NUMERIC(14,2) NOT NULL,
  interest_amount NUMERIC(14,2) NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) DEFAULT 0,
  paid_date DATE,
  payment_method VARCHAR(32),
  payment_reference VARCHAR(255),
  is_overdue BOOLEAN DEFAULT false,
  late_fee NUMERIC(14,2) DEFAULT 0,
  status VARCHAR(32) DEFAULT 'pending', -- pending, paid, partial, overdue
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loans_applicant ON loans(applicant_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loan_repayments_loan ON loan_repayments(loan_id);
CREATE INDEX idx_loan_repayments_due_date ON loan_repayments(due_date);

-- -----------------------------------------
-- Financial Wallets
-- -----------------------------------------

CREATE TYPE wallet_transaction_type AS ENUM ('deposit','withdrawal','transfer','loan_disbursement','loan_repayment','commission','refund','fee');
CREATE TYPE wallet_transaction_status AS ENUM ('pending','completed','failed','cancelled');

-- Wallets
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  balance NUMERIC(14,2) DEFAULT 0 NOT NULL,
  currency CHAR(3) DEFAULT 'RWF',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, salon_id)
);

-- Wallet Transactions
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_type wallet_transaction_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  balance_before NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  status wallet_transaction_status DEFAULT 'pending',
  reference_type VARCHAR(64), -- e.g., 'loan', 'sale', 'payment'
  reference_id UUID,
  description TEXT,
  transaction_reference VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

-- -----------------------------------------
-- Airtel Agent Integration
-- -----------------------------------------

CREATE TYPE airtel_agent_type AS ENUM ('agent','agent_lite');
CREATE TYPE airtel_transaction_type AS ENUM ('cash_in','cash_out','collection','disbursement','commission');

-- Airtel Agent Registrations
CREATE TABLE airtel_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  agent_type airtel_agent_type NOT NULL,
  agent_id VARCHAR(128) UNIQUE, -- Airtel agent ID
  agent_lite_id VARCHAR(128), -- For AgentLite
  phone_number VARCHAR(32) NOT NULL,
  status VARCHAR(32) DEFAULT 'pending', -- pending, active, suspended
  float_balance NUMERIC(14,2) DEFAULT 0,
  total_commissions NUMERIC(14,2) DEFAULT 0,
  registered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Airtel Transactions
CREATE TABLE airtel_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtel_agent_id UUID REFERENCES airtel_agents(id) ON DELETE CASCADE,
  transaction_type airtel_transaction_type NOT NULL,
  airtel_transaction_id VARCHAR(255) UNIQUE, -- Airtel's transaction ID
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'RWF',
  customer_phone VARCHAR(32),
  status VARCHAR(32) DEFAULT 'pending', -- pending, completed, failed
  commission_amount NUMERIC(14,2) DEFAULT 0,
  airtel_response JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Airtel Float Reconciliation
CREATE TABLE airtel_float_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airtel_agent_id UUID REFERENCES airtel_agents(id) ON DELETE CASCADE,
  system_balance NUMERIC(14,2) NOT NULL,
  airtel_balance NUMERIC(14,2) NOT NULL,
  difference NUMERIC(14,2) NOT NULL,
  reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  reconciled_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_airtel_agents_user ON airtel_agents(user_id);
CREATE INDEX idx_airtel_transactions_agent ON airtel_transactions(airtel_agent_id);
CREATE INDEX idx_airtel_transactions_airtel_id ON airtel_transactions(airtel_transaction_id);

-- Add triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_chart_of_accounts') THEN
    CREATE TRIGGER set_timestamp_chart_of_accounts
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_journal_entries') THEN
    CREATE TRIGGER set_timestamp_journal_entries
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_invoices') THEN
    CREATE TRIGGER set_timestamp_invoices
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_expense_claims') THEN
    CREATE TRIGGER set_timestamp_expense_claims
    BEFORE UPDATE ON expense_claims
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_loans') THEN
    CREATE TRIGGER set_timestamp_loans
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_wallets') THEN
    CREATE TRIGGER set_timestamp_wallets
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_wallet_transactions') THEN
    CREATE TRIGGER set_timestamp_wallet_transactions
    BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_airtel_agents') THEN
    CREATE TRIGGER set_timestamp_airtel_agents
    BEFORE UPDATE ON airtel_agents
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
END;
$$;

