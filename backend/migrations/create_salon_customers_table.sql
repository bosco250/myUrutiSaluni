-- Create salon_customers table for salon-specific customer data
CREATE TABLE IF NOT EXISTS salon_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  visit_count INTEGER DEFAULT 0,
  last_visit_date TIMESTAMPTZ,
  first_visit_date TIMESTAMPTZ,
  total_spent NUMERIC(14,2) DEFAULT 0,
  tags TEXT[], -- Array of tags like 'VIP', 'Regular', 'New'
  notes TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  birthday DATE,
  anniversary_date DATE,
  follow_up_date TIMESTAMPTZ,
  communication_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(salon_id, customer_id)
);

CREATE INDEX idx_salon_customers_salon ON salon_customers(salon_id);
CREATE INDEX idx_salon_customers_customer ON salon_customers(customer_id);
CREATE INDEX idx_salon_customers_last_visit ON salon_customers(last_visit_date);
CREATE INDEX idx_salon_customers_tags ON salon_customers USING GIN(tags);

-- Migrate existing data: Create salon_customer records from sales and appointments
INSERT INTO salon_customers (salon_id, customer_id, visit_count, last_visit_date, first_visit_date, total_spent)
SELECT 
  salon_id,
  customer_id,
  COUNT(*) as visit_count,
  MAX(created_at) as last_visit_date,
  MIN(created_at) as first_visit_date,
  COALESCE(SUM(total_amount), 0) as total_spent
FROM sales
WHERE customer_id IS NOT NULL
GROUP BY salon_id, customer_id
ON CONFLICT (salon_id, customer_id) DO UPDATE SET
  visit_count = EXCLUDED.visit_count,
  last_visit_date = EXCLUDED.last_visit_date,
  first_visit_date = EXCLUDED.first_visit_date,
  total_spent = EXCLUDED.total_spent;

-- Also create records from appointments (if customer has appointments but no sales)
INSERT INTO salon_customers (salon_id, customer_id, visit_count, last_visit_date, first_visit_date)
SELECT 
  salon_id,
  customer_id,
  COUNT(*) as visit_count,
  MAX(scheduled_start) as last_visit_date,
  MIN(scheduled_start) as first_visit_date
FROM appointments
WHERE customer_id IS NOT NULL
  AND (salon_id, customer_id) NOT IN (SELECT salon_id, customer_id FROM salon_customers)
GROUP BY salon_id, customer_id
ON CONFLICT (salon_id, customer_id) DO UPDATE SET
  visit_count = salon_customers.visit_count + EXCLUDED.visit_count,
  last_visit_date = GREATEST(salon_customers.last_visit_date, EXCLUDED.last_visit_date),
  first_visit_date = LEAST(salon_customers.first_visit_date, EXCLUDED.first_visit_date);

