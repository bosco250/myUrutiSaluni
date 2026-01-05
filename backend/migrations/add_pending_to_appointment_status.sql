-- Migration: Add 'pending' status to appointment_status_enum
-- This migration adds 'pending' to the enum and updates the default value

-- Step 1: Add 'pending' to the enum
-- Note: This will fail if 'pending' already exists, which is fine
-- Run this migration only once
ALTER TYPE appointment_status_enum ADD VALUE 'pending';

-- Step 2: Update the default value for the status column
ALTER TABLE appointments 
ALTER COLUMN status SET DEFAULT 'pending';

-- Step 3: (Optional) Update existing appointments that are 'booked' to 'pending'
-- Uncomment the line below if you want to migrate existing booked appointments to pending
-- UPDATE appointments SET status = 'pending' WHERE status = 'booked';

-- Note: If you get an error that 'pending' already exists, that's okay - 
-- it means the migration was already run. You can safely ignore that error.

