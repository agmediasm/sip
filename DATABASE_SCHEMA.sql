-- =============================================
-- S I P - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Venues (Cluburi/Baruri)
CREATE TABLE venues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tables (Mese)
CREATE TABLE tables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    zone VARCHAR(100), -- 'vip', 'main', 'bar', 'terrace'
    qr_code VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Categories
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Menu Items
CREATE TABLE menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_popular BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers (Clienți)
CREATE TABLE customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    points INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservations (Rezervări)
CREATE TABLE reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    party_size INTEGER NOT NULL,
    reservation_time TIME NOT NULL,
    reservation_date DATE NOT NULL,
    notes TEXT,
    is_vip BOOLEAN DEFAULT false,
    is_birthday BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'seated', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders (Comenzi)
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    table_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'
    payment_type VARCHAR(20), -- 'card', 'cash'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
    subtotal DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL
);

-- =============================================
-- INDEXES for performance
-- =============================================

CREATE INDEX idx_tables_venue ON tables(venue_id);
CREATE INDEX idx_tables_qr ON tables(qr_code);
CREATE INDEX idx_menu_items_venue ON menu_items(venue_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_orders_venue ON orders(venue_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_reservations_venue_date ON reservations(venue_id, reservation_date);
CREATE INDEX idx_customers_phone ON customers(phone);

-- =============================================
-- ENABLE REALTIME (pentru live updates)
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Disable RLS for now (for simplicity in demo)
-- In production, you'd want to enable this
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for demo)
CREATE POLICY "Allow anonymous read" ON venues FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON tables FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Allow anonymous all" ON customers FOR ALL USING (true);
CREATE POLICY "Allow anonymous all" ON reservations FOR ALL USING (true);
CREATE POLICY "Allow anonymous all" ON orders FOR ALL USING (true);
CREATE POLICY "Allow anonymous all" ON order_items FOR ALL USING (true);

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert demo venue
INSERT INTO venues (id, name, location) VALUES 
('11111111-1111-1111-1111-111111111111', 'NUBA', 'București');

-- Insert tables
INSERT INTO tables (venue_id, table_number, zone, qr_code) VALUES
('11111111-1111-1111-1111-111111111111', 'VIP 1', 'vip', 'SIP-VIP1'),
('11111111-1111-1111-1111-111111111111', 'VIP 2', 'vip', 'SIP-VIP2'),
('11111111-1111-1111-1111-111111111111', 'VIP 3', 'vip', 'SIP-VIP3'),
('11111111-1111-1111-1111-111111111111', 'M1', 'main', 'SIP-M1'),
('11111111-1111-1111-1111-111111111111', 'M2', 'main', 'SIP-M2'),
('11111111-1111-1111-1111-111111111111', 'M3', 'main', 'SIP-M3'),
('11111111-1111-1111-1111-111111111111', 'M4', 'main', 'SIP-M4'),
('11111111-1111-1111-1111-111111111111', 'M5', 'main', 'SIP-M5'),
('11111111-1111-1111-1111-111111111111', 'B1', 'bar', 'SIP-B1'),
('11111111-1111-1111-1111-111111111111', 'B2', 'bar', 'SIP-B2'),
('11111111-1111-1111-1111-111111111111', 'B3', 'bar', 'SIP-B3');

-- Insert categories
INSERT INTO categories (venue_id, name, slug, icon, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Cocktails', 'cocktails', 'martini', 1),
('11111111-1111-1111-1111-111111111111', 'Shots', 'shots', 'zap', 2),
('11111111-1111-1111-1111-111111111111', 'Champagne', 'champagne', 'sparkles', 3),
('11111111-1111-1111-1111-111111111111', 'Bottles', 'bottles', 'wine', 4),
('11111111-1111-1111-1111-111111111111', 'Beer', 'beer', 'beer', 5),
('11111111-1111-1111-1111-111111111111', 'Soft', 'soft', 'droplet', 6);

-- Insert menu items (Cocktails)
INSERT INTO menu_items (venue_id, category_id, name, description, price, is_popular) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    'Negroni',
    'Gin, Campari, Sweet Vermouth',
    45,
    true
FROM categories WHERE slug = 'cocktails';

INSERT INTO menu_items (venue_id, category_id, name, description, price, is_popular) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    'Espresso Martini',
    'Vodka, Kahlúa, Fresh Espresso',
    48,
    true
FROM categories WHERE slug = 'cocktails';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    'Aperol Spritz',
    'Aperol, Prosecco, Soda',
    42
FROM categories WHERE slug = 'cocktails';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    'Moscow Mule',
    'Vodka, Ginger Beer, Lime',
    40
FROM categories WHERE slug = 'cocktails';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    'Mojito',
    'White Rum, Mint, Lime, Sugar',
    38
FROM categories WHERE slug = 'cocktails';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    'Old Fashioned',
    'Bourbon, Angostura, Sugar',
    52
FROM categories WHERE slug = 'cocktails';

INSERT INTO menu_items (venue_id, category_id, name, description, price, is_popular) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    'Long Island',
    'Vodka, Gin, Rum, Tequila, Triple Sec',
    55,
    true
FROM categories WHERE slug = 'cocktails';

-- Insert menu items (Shots)
INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Jägermeister', 'Herbal liqueur', 18
FROM categories WHERE slug = 'shots';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Tequila Gold', 'With lime & salt', 22
FROM categories WHERE slug = 'shots';

INSERT INTO menu_items (venue_id, category_id, name, description, price, is_popular) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'B-52', 'Kahlúa, Baileys, Grand Marnier', 25, true
FROM categories WHERE slug = 'shots';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Kamikaze', 'Vodka, Triple Sec, Lime', 20
FROM categories WHERE slug = 'shots';

-- Insert menu items (Champagne)
INSERT INTO menu_items (venue_id, category_id, name, description, price, is_premium) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Moët & Chandon', 'Brut Impérial 750ml', 650, true
FROM categories WHERE slug = 'champagne';

INSERT INTO menu_items (venue_id, category_id, name, description, price, is_premium) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Veuve Clicquot', 'Yellow Label 750ml', 750, true
FROM categories WHERE slug = 'champagne';

INSERT INTO menu_items (venue_id, category_id, name, description, price, is_premium) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Dom Pérignon', 'Vintage 750ml', 1800, true
FROM categories WHERE slug = 'champagne';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Prosecco DOC', 'Italian Sparkling 750ml', 180
FROM categories WHERE slug = 'champagne';

-- Insert menu items (Bottles)
INSERT INTO menu_items (venue_id, category_id, name, description, price, is_popular) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Grey Goose', 'Premium Vodka 700ml', 450, true
FROM categories WHERE slug = 'bottles';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Belvedere', 'Polish Vodka 700ml', 480
FROM categories WHERE slug = 'bottles';

INSERT INTO menu_items (venue_id, category_id, name, description, price, is_premium) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Hennessy VS', 'Cognac 700ml', 520, true
FROM categories WHERE slug = 'bottles';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Jack Daniels', 'Tennessee Whiskey 700ml', 380
FROM categories WHERE slug = 'bottles';

-- Insert menu items (Beer)
INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Heineken', '330ml', 18
FROM categories WHERE slug = 'beer';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Corona', '330ml with lime', 22
FROM categories WHERE slug = 'beer';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Peroni', '330ml', 20
FROM categories WHERE slug = 'beer';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Guinness', '440ml', 25
FROM categories WHERE slug = 'beer';

-- Insert menu items (Soft)
INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Red Bull', '250ml', 20
FROM categories WHERE slug = 'soft';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Coca-Cola', '330ml', 12
FROM categories WHERE slug = 'soft';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Mineral Water', 'Borsec 500ml', 10
FROM categories WHERE slug = 'soft';

INSERT INTO menu_items (venue_id, category_id, name, description, price) 
SELECT '11111111-1111-1111-1111-111111111111', id, 'Fresh Orange', '300ml', 25
FROM categories WHERE slug = 'soft';

-- Insert sample customers
INSERT INTO customers (name, phone, total_spent, visit_count, points) VALUES
('Andrei Marinescu', '0722123456', 45600, 28, 456),
('Maria Popescu', '0733456789', 38200, 22, 382),
('Alexandru Dinu', '0744789012', 32100, 19, 321),
('Elena Ionescu', '0755012345', 28500, 15, 285),
('Cristian Popa', '0766345678', 24800, 20, 248);

-- Insert sample reservations for today
INSERT INTO reservations (venue_id, table_id, customer_name, customer_phone, party_size, reservation_time, reservation_date, notes, is_vip) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    t.id,
    'Andrei M.',
    '0722123456',
    6,
    '23:00',
    CURRENT_DATE,
    'Același loc ca data trecută',
    true
FROM tables t WHERE t.table_number = 'VIP 1';

INSERT INTO reservations (venue_id, table_id, customer_name, customer_phone, party_size, reservation_time, reservation_date, notes, is_vip, is_birthday) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    t.id,
    'Maria P.',
    '0733456789',
    8,
    '22:30',
    CURRENT_DATE,
    'Vor tort la 00:00, surpriză',
    true,
    true
FROM tables t WHERE t.table_number = 'VIP 3';

INSERT INTO reservations (venue_id, table_id, customer_name, customer_phone, party_size, reservation_time, reservation_date) 
SELECT 
    '11111111-1111-1111-1111-111111111111',
    t.id,
    'Alex D.',
    '0744789012',
    4,
    '23:30',
    CURRENT_DATE
FROM tables t WHERE t.table_number = 'M1';

-- =============================================
-- DONE! Your database is ready.
-- =============================================
