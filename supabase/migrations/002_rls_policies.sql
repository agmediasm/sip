-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VENUES - Public read for active venues
-- ============================================
CREATE POLICY "Venues are viewable by everyone" ON venues
  FOR SELECT USING (is_active = true);

CREATE POLICY "Venues are editable by service role only" ON venues
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- EVENTS - Public read for active events
-- ============================================
CREATE POLICY "Active events are viewable by everyone" ON events
  FOR SELECT USING (is_active = true);

CREATE POLICY "Events management requires service role" ON events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Events update requires service role" ON events
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Events delete requires service role" ON events
  FOR DELETE USING (auth.role() = 'service_role');

-- ============================================
-- EVENT_TABLES - Public read
-- ============================================
CREATE POLICY "Tables are viewable by everyone" ON event_tables
  FOR SELECT USING (true);

CREATE POLICY "Tables management requires service role" ON event_tables
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CATEGORIES - Public read for active
-- ============================================
CREATE POLICY "Active categories viewable by everyone" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Categories management requires service role" ON categories
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- MENU_ITEMS - Public read for available
-- ============================================
CREATE POLICY "Available menu items viewable by everyone" ON menu_items
  FOR SELECT USING (is_available = true);

CREATE POLICY "Menu management requires service role" ON menu_items
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- EVENT_MENU - Public read
-- ============================================
CREATE POLICY "Event menu viewable by everyone" ON event_menu
  FOR SELECT USING (true);

CREATE POLICY "Event menu management requires service role" ON event_menu
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- WAITERS - Restricted access
-- ============================================
CREATE POLICY "Waiters can view active waiters in their venue" ON waiters
  FOR SELECT USING (is_active = true);

CREATE POLICY "Waiter management requires service role" ON waiters
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ORDERS - Controlled access
-- ============================================
-- Anyone can create orders (guests)
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Anyone can view orders (needed for realtime)
CREATE POLICY "Orders viewable for realtime" ON orders
  FOR SELECT USING (true);

-- Only service role can update/delete
CREATE POLICY "Order updates require service role" ON orders
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Order deletes require service role" ON orders
  FOR DELETE USING (auth.role() = 'service_role');

-- ============================================
-- ORDER_ITEMS - Same as orders
-- ============================================
CREATE POLICY "Anyone can create order items" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Order items viewable" ON order_items
  FOR SELECT USING (true);

CREATE POLICY "Order items update requires service role" ON order_items
  FOR UPDATE USING (auth.role() = 'service_role');

-- ============================================
-- CUSTOMERS - Restricted
-- ============================================
CREATE POLICY "Customers viewable by service role" ON customers
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Customers management by service role" ON customers
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- RESERVATIONS - Controlled
-- ============================================
CREATE POLICY "Reservations viewable" ON reservations
  FOR SELECT USING (true);

CREATE POLICY "Reservations management requires service role" ON reservations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- TABLE_ASSIGNMENTS - Viewable
-- ============================================
CREATE POLICY "Assignments viewable" ON table_assignments
  FOR SELECT USING (true);

CREATE POLICY "Assignments management requires service role" ON table_assignments
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- LOGS - Admin only
-- ============================================
CREATE POLICY "Logs insert allowed" ON logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Logs viewable by service role only" ON logs
  FOR SELECT USING (auth.role() = 'service_role');

-- ============================================
-- ACTIVE_SESSIONS - Controlled
-- ============================================
CREATE POLICY "Sessions insert allowed" ON active_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Sessions update allowed" ON active_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Sessions viewable by service role" ON active_sessions
  FOR SELECT USING (auth.role() = 'service_role');
