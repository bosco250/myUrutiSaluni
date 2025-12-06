-- Create customer_communications table for tracking customer communications
CREATE TABLE IF NOT EXISTS customer_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('sms', 'email', 'phone', 'in_app')),
  purpose VARCHAR(32) DEFAULT 'other' CHECK (purpose IN ('appointment_reminder', 'appointment_confirmation', 'appointment_cancellation', 'marketing', 'follow_up', 'birthday', 'anniversary', 'other')),
  subject TEXT NOT NULL,
  message TEXT,
  recipient VARCHAR(255),
  status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customer_communications_salon ON customer_communications(salon_id);
CREATE INDEX idx_customer_communications_customer ON customer_communications(customer_id);
CREATE INDEX idx_customer_communications_type ON customer_communications(type);
CREATE INDEX idx_customer_communications_purpose ON customer_communications(purpose);
CREATE INDEX idx_customer_communications_created ON customer_communications(created_at);

