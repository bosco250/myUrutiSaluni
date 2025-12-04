-- Salon Association & Salon Operations Platform
-- PostgreSQL schema (DDL)
-- Version 1.0

-- NOTE: This schema is opinionated and designed for scalability. Adjust lengths, nullable settings,
-- and add/remove columns based on final requirements.

-- -----------------------------------------
-- Extensions
-- -----------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------
-- ENUMS
-- -----------------------------------------
CREATE TYPE user_role_enum AS ENUM ('super_admin','association_admin','district_leader','salon_owner','salon_employee','customer');
CREATE TYPE membership_status_enum AS ENUM ('new','active','pending_renewal','expired','suspended');
CREATE TYPE payment_method_enum AS ENUM ('cash','mobile_money','card','bank_transfer');
CREATE TYPE appointment_status_enum AS ENUM ('booked','confirmed','in_progress','completed','cancelled','no_show');
CREATE TYPE attendance_type_enum AS ENUM ('clock_in','clock_out');
CREATE TYPE inventory_movement_type AS ENUM ('purchase','consumption','adjustment','transfer','return');
CREATE TYPE inspection_status_enum AS ENUM ('scheduled','done','failed','compliant','non_compliant');

-- -----------------------------------------
-- Core: Users & Auth
-- -----------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(32),
  password_hash TEXT, -- if storing locally; consider external auth
  full_name VARCHAR(255),
  role user_role_enum NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_phone ON users(phone);

-- For organizations/tenants if needed later
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(128),
  description TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone VARCHAR(32),
  email VARCHAR(255),
  website VARCHAR(255),
  city VARCHAR(100),
  district VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Rwanda',
  status VARCHAR(32) DEFAULT 'active',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_salons_owner ON salons(owner_id);
CREATE INDEX idx_salons_location ON salons(city, district);

-- Salon Employees separate from users table to store salon-specific info
CREATE TABLE salon_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  role_title VARCHAR(128), -- e.g., Senior Stylist
  skills TEXT[], -- postgres array of skills/specializations
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  commission_rate NUMERIC(5,2) DEFAULT 0.00, -- percent
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_emp_salon ON salon_employees(salon_id);

-- Customers (optional separate from users) - allow casual customers without auth
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  email VARCHAR(255),
  preferences JSONB DEFAULT '{}'::jsonb,
  loyalty_points BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customers_phone ON customers(phone);

-- -----------------------------------------
-- Memberships (Association level)
-- -----------------------------------------
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  category VARCHAR(64), -- owner, trainee, staff, etc.
  status membership_status_enum DEFAULT 'new',
  start_date DATE,
  end_date DATE,
  membership_number VARCHAR(128) UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memberships_status ON memberships(status);

CREATE TABLE membership_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'RWF',
  payment_method payment_method_enum,
  transaction_reference VARCHAR(255),
  paid_at TIMESTAMPTZ DEFAULT now(),
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------
-- Services & Pricing
-- -----------------------------------------
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  code VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  base_price NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_services_salon ON services(salon_id);

-- Option to have global catalog with overrides per salon
CREATE TABLE service_price_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  overridden_price NUMERIC(12,2) NOT NULL,
  effective_from DATE,
  effective_to DATE,
  UNIQUE(service_id, salon_id)
);

-- -----------------------------------------
-- Appointments & Scheduling
-- -----------------------------------------
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status appointment_status_enum DEFAULT 'booked',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE appointment_staff (
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  salon_employee_id UUID REFERENCES salon_employees(id) ON DELETE SET NULL,
  PRIMARY KEY(appointment_id, salon_employee_id)
);

CREATE INDEX idx_appointments_salon_time ON appointments(salon_id, scheduled_start);

-- -----------------------------------------
-- POS, Sales & Payments
-- -----------------------------------------
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'RWF',
  payment_method payment_method_enum,
  payment_reference VARCHAR(255),
  status VARCHAR(32) DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  salon_employee_id UUID REFERENCES salon_employees(id) ON DELETE SET NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  quantity NUMERIC(12,3) DEFAULT 1,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sales_salon_date ON sales(salon_id, created_at);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  method payment_method_enum,
  transaction_reference VARCHAR(255),
  paid_at TIMESTAMPTZ DEFAULT now(),
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------
-- Products & Inventory
-- -----------------------------------------
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  sku VARCHAR(128),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_price NUMERIC(12,2),
  tax_rate NUMERIC(5,2) DEFAULT 0,
  is_inventory_item BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  email VARCHAR(255),
  address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  movement_type inventory_movement_type NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  reference_id UUID, -- e.g., sale.id or purchase.id
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_product ON inventory_movements(product_id);

-- -----------------------------------------
-- Attendance
-- -----------------------------------------
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_employee_id UUID REFERENCES salon_employees(id) ON DELETE CASCADE,
  type attendance_type_enum NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  source VARCHAR(64), -- mobile_app, ussd, web
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_attendance_employee_date ON attendance_logs(salon_employee_id, recorded_at);

-- -----------------------------------------
-- Inspections & Compliance
-- -----------------------------------------
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  performed_at TIMESTAMPTZ,
  status inspection_status_enum DEFAULT 'scheduled',
  findings TEXT,
  documents JSONB, -- uploaded images/docs
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inspections_salon ON inspections(salon_id);

-- -----------------------------------------
-- Training & Certification
-- -----------------------------------------
CREATE TABLE training_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  venue VARCHAR(255),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  fee NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE training_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_id UUID REFERENCES training_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'registered',
  paid_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  training_id UUID REFERENCES training_events(id) ON DELETE SET NULL,
  certificate_number VARCHAR(128) UNIQUE,
  issued_at TIMESTAMPTZ DEFAULT now(),
  valid_until DATE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- -----------------------------------------
-- Notifications & Audit
-- -----------------------------------------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  body TEXT,
  channel VARCHAR(32), -- push, sms, email
  is_read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(128),
  resource_id UUID,
  before JSONB,
  after JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------
-- Commission & Payroll
-- -----------------------------------------
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_employee_id UUID REFERENCES salon_employees(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  total_amount NUMERIC(14,2),
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payroll_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  salon_employee_id UUID REFERENCES salon_employees(id) ON DELETE CASCADE,
  gross_pay NUMERIC(14,2),
  deductions NUMERIC(14,2) DEFAULT 0,
  net_pay NUMERIC(14,2),
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------
-- Settings & Lookups
-- -----------------------------------------
CREATE TABLE app_settings (
  key VARCHAR(128) PRIMARY KEY,
  value JSONB
);

-- -----------------------------------------
-- Views (examples)
-- -----------------------------------------
-- Example: salon_daily_revenue view
CREATE OR REPLACE VIEW salon_daily_revenue AS
SELECT
  s.id AS salon_id,
  date_trunc('day', sa.created_at) AS day,
  sum(sa.total_amount) AS total_revenue,
  count(sa.id) AS total_sales
FROM salons s
LEFT JOIN sales sa ON sa.salon_id = s.id
GROUP BY s.id, date_trunc('day', sa.created_at);

-- -----------------------------------------
-- Triggers (update timestamps)
-- -----------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables with updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_users') THEN
    CREATE TRIGGER set_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_salons') THEN
    CREATE TRIGGER set_timestamp_salons
    BEFORE UPDATE ON salons
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_services') THEN
    CREATE TRIGGER set_timestamp_services
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
END;
$$;

-- -----------------------------------------
-- Sample seed data (optional) - keep commented
-- -----------------------------------------
-- INSERT INTO users (email, full_name, role) VALUES ('admin@assoc.test','Assoc Admin','association_admin');

-- End of schema
