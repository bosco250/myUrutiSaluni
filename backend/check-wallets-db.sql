-- SQL queries to debug wallets issue

-- 1. Check if wallets table exists and has data
SELECT COUNT(*) as wallet_count FROM wallets;

-- 2. Check wallets with user information
SELECT 
    w.id as wallet_id,
    w.user_id,
    w.balance,
    w.currency,
    w.is_active,
    w.created_at,
    u.full_name,
    u.email,
    u.role
FROM wallets w
LEFT JOIN users u ON w.user_id = u.id
ORDER BY w.created_at DESC
LIMIT 10;

-- 3. Check user roles distribution
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;

-- 4. Check if there are any admin users
SELECT id, full_name, email, role, is_active
FROM users 
WHERE role IN ('super_admin', 'association_admin')
ORDER BY created_at DESC;

-- 5. Check if wallets are properly linked to users
SELECT 
    COUNT(*) as total_wallets,
    COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as wallets_with_users,
    COUNT(CASE WHEN u.id IS NULL THEN 1 END) as orphaned_wallets
FROM wallets w
LEFT JOIN users u ON w.user_id = u.id;