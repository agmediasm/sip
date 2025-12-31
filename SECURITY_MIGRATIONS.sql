-- =============================================
-- S I P - Security Migrations
-- Run these in Supabase SQL Editor
-- =============================================

-- 1. Add PIN column to waiters table
ALTER TABLE waiters ADD COLUMN IF NOT EXISTS pin VARCHAR(4);

-- 2. Generate random PINs for existing waiters without PIN
UPDATE waiters 
SET pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE pin IS NULL;

-- 3. Add broadcast_to_all column to orders (for future use)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS broadcast_to_all BOOLEAN DEFAULT false;

-- 4. Add manager_pin to venues (for manager authentication)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS manager_pin VARCHAR(6);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- 5. Set a default manager PIN (change this!)
UPDATE venues SET manager_pin = '123456' WHERE manager_pin IS NULL;

-- 6. Add slug for existing venue
UPDATE venues SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;

-- =============================================
-- ROW LEVEL SECURITY POLICIES (Recommended)
-- =============================================

-- Note: These are examples - adjust based on your auth setup

-- Orders: Anyone can insert, only staff can update
-- CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Staff can update orders" ON orders FOR UPDATE USING (true);

-- Waiters: Only authenticated can read (with PIN hidden)
-- Menu items: Anyone can read

-- =============================================
-- DONE! 
-- Remember to set proper manager_pin for each venue
-- =============================================
