-- Create wallets for all users who don't have one
-- This script will create a wallet for each user that doesn't already have one

INSERT INTO wallets (id, user_id, salon_id, balance, currency, is_active, metadata, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    u.id as user_id,
    NULL as salon_id,
    0 as balance,
    'RWF' as currency,
    true as is_active,
    '{}' as metadata,
    NOW() as created_at,
    NOW() as updated_at
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id AND w.salon_id IS NULL
WHERE w.id IS NULL;

-- Check the results
SELECT 
    COUNT(*) as total_wallets_created,
    'Wallets created for users without existing wallets' as description;

-- Show wallet summary
SELECT 
    u.role,
    COUNT(w.id) as wallet_count
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id
GROUP BY u.role
ORDER BY u.role;