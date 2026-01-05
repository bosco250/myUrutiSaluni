-- Create salon_rewards_config table
CREATE TABLE IF NOT EXISTS salon_rewards_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL UNIQUE REFERENCES salons(id) ON DELETE CASCADE,
  points_per_currency_unit DECIMAL(10,4) DEFAULT 0.01 NOT NULL,
  redemption_rate DECIMAL(10,4) DEFAULT 0.1 NOT NULL,
  min_redemption_points INTEGER DEFAULT 100 NOT NULL,
  points_expiration_days INTEGER,
  vip_threshold_points INTEGER DEFAULT 1000 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_rewards_config_salon ON salon_rewards_config(salon_id);

-- Add comments
COMMENT ON TABLE salon_rewards_config IS 'Rewards configuration per salon';
COMMENT ON COLUMN salon_rewards_config.points_per_currency_unit IS 'Points earned per currency unit. Default: 0.01 (1 point per RWF 100)';
COMMENT ON COLUMN salon_rewards_config.redemption_rate IS 'Discount amount per point. Default: 0.1 (100 points = RWF 10)';
COMMENT ON COLUMN salon_rewards_config.min_redemption_points IS 'Minimum points required for redemption';
COMMENT ON COLUMN salon_rewards_config.points_expiration_days IS 'Number of days before points expire. NULL = never expire';
COMMENT ON COLUMN salon_rewards_config.vip_threshold_points IS 'Points required to achieve VIP status';

