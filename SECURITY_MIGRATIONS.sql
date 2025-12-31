-- =============================================
-- S I P - Security Migrations
-- Run these in Supabase SQL Editor
-- =============================================

-- 1. Add PIN column to waiters table (for staff authentication)
ALTER TABLE waiters ADD COLUMN IF NOT EXISTS pin VARCHAR(4);

-- 2. Generate random PINs for existing waiters without PIN
UPDATE waiters 
SET pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE pin IS NULL;

-- 3. Add manager_pin to venues (for manager authentication)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS manager_pin VARCHAR(6) DEFAULT '1234';

-- 4. Add slug for venue URLs (new QR system)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- 5. Add social_links for venue (optional future use)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- 6. Set default values
UPDATE venues SET manager_pin = '1234' WHERE manager_pin IS NULL;
UPDATE venues SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- VENUES: Public read (except manager_pin)
CREATE POLICY "Anyone can read venues (limited fields)" ON venues
  FOR SELECT USING (true);
-- Note: Create a view without manager_pin for public access if needed

-- EVENTS: Public read for active events
CREATE POLICY "Anyone can read events" ON events
  FOR SELECT USING (true);

-- EVENT_TABLES: Public read for table layouts
CREATE POLICY "Anyone can read event_tables" ON event_tables
  FOR SELECT USING (true);

-- MENU_ITEMS: Public read for menu display
CREATE POLICY "Anyone can read menu_items" ON menu_items
  FOR SELECT USING (true);

-- CATEGORIES: Public read
CREATE POLICY "Anyone can read categories" ON categories
  FOR SELECT USING (true);

-- ORDERS: Anyone can create, limit reading
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Read own orders or staff" ON orders
  FOR SELECT USING (true);
-- Note: In production, restrict to waiter_id or admin

-- ORDER_ITEMS: Same as orders
CREATE POLICY "Anyone can create order_items" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Read order_items" ON order_items
  FOR SELECT USING (true);

-- WAITERS: Public read (but hide PIN in app logic)
CREATE POLICY "Read waiters" ON waiters
  FOR SELECT USING (true);
-- Note: PIN should be hidden in application layer, not exposed to client

-- TABLE_ASSIGNMENTS: Staff can read/write
CREATE POLICY "Read table_assignments" ON table_assignments
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage table_assignments" ON table_assignments
  FOR ALL USING (true);

-- RESERVATIONS: Staff read/write
CREATE POLICY "Read reservations" ON reservations
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage reservations" ON reservations
  FOR ALL USING (true);

-- =============================================
-- IMPORTANT SECURITY NOTES
-- =============================================

-- 1. The PIN is stored in plain text currently. For production:
--    - Consider hashing PINs with bcrypt
--    - Or use Supabase Auth for proper authentication

-- 2. Current RLS policies are permissive for development.
--    For production:
--    - Implement proper Supabase Auth
--    - Create more restrictive policies based on auth.uid()
--    - Use service role key only on server-side

-- 3. For now, security is implemented in application layer:
--    - Staff login requires phone + PIN
--    - Manager login requires PIN
--    - Rate limiting on orders (30s cooldown)

-- =============================================
-- CHANGE MANAGER PIN (IMPORTANT!)
-- =============================================

-- Change the default manager PIN for your venue:
-- UPDATE venues SET manager_pin = 'YOUR_NEW_PIN' WHERE id = 'YOUR_VENUE_ID';

-- Example:
-- UPDATE venues SET manager_pin = '987654' WHERE id = '11111111-1111-1111-1111-111111111111';

-- =============================================
-- DONE! Remember to:
-- 1. Change default manager_pin
-- 2. Set PINs for all staff members in Manager > Staff tab
-- =============================================
