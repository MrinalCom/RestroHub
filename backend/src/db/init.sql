CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('customer', 'staff', 'owner');
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'completed', 'cancelled');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  order_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Craving profile per dish, same 5 dimensions the AI extracts from customer mood text.
-- Keeping this as an explicit small vector (not a black-box embedding) so scores stay explainable.
CREATE TABLE menu_item_profiles (
  menu_item_id UUID PRIMARY KEY REFERENCES menu_items(id) ON DELETE CASCADE,
  comfort REAL NOT NULL DEFAULT 0,
  spicy REAL NOT NULL DEFAULT 0,
  light REAL NOT NULL DEFAULT 0,
  sweet REAL NOT NULL DEFAULT 0,
  energizing REAL NOT NULL DEFAULT 0
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id),
  status order_status NOT NULL DEFAULT 'pending',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id),
  party_size INTEGER NOT NULL,
  reserved_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every mood recommendation is logged with whether it converted to an order.
-- This is the feedback loop a learned ranker would eventually train on.
CREATE TABLE mood_recommendation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id),
  mood_text TEXT NOT NULL,
  craving_profile JSONB NOT NULL,
  recommended_item_ids UUID[] NOT NULL,
  converted_item_id UUID REFERENCES menu_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Owner-triggered review/sentiment scrapes: one row per scrape run against an
-- owner-supplied URL, with Claude's sentiment/theme extraction over the scraped text.
CREATE TABLE review_scrapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  review_count INTEGER NOT NULL,
  overall_sentiment TEXT NOT NULL,
  positive_themes JSONB NOT NULL,
  negative_themes JSONB NOT NULL,
  summary TEXT NOT NULL,
  sentiment_breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full Indian menu spanning six categories, with craving profiles covering
-- every corner of the comfort/spicy/light/sweet/energizing space.
INSERT INTO menu_items (name, description, price, category) VALUES
-- Starters
('Samosa', 'Crisp golden pastry filled with spiced potatoes and peas', 5.99, 'starters'),
('Paneer Tikka', 'Char-grilled cottage cheese marinated in smoky tandoori spices', 8.99, 'starters'),
('Chicken 65', 'Deep-fried Chennai-style chicken bites tossed in fiery chili masala', 9.49, 'starters'),
('Aloo Tikki', 'Pan-fried potato patties with tangy tamarind and mint chutney', 5.49, 'starters'),
-- Main Course
('Butter Chicken', 'Creamy tomato curry with tender tandoori chicken, a comfort classic', 13.99, 'mains'),
('Paneer Butter Masala', 'Cottage cheese simmered in a rich, buttery tomato gravy', 12.99, 'mains'),
('Dal Makhani', 'Slow-cooked black lentils finished with cream and butter', 10.99, 'mains'),
('Palak Paneer', 'Cottage cheese in a silky, lightly spiced spinach gravy', 11.49, 'mains'),
('Rogan Josh', 'Kashmiri-style lamb curry, deep red and aromatic with whole spices', 14.99, 'mains'),
('Chole Masala', 'Punjabi chickpea curry simmered with onion, tomato, and garam masala', 10.49, 'mains'),
-- Biryani & Rice
('Hyderabadi Chicken Biryani', 'Layered basmati rice and chicken slow-cooked in dum style with saffron', 14.99, 'biryani'),
('Vegetable Biryani', 'Fragrant basmati rice tossed with garden vegetables and whole spices', 12.99, 'biryani'),
('Jeera Rice', 'Steamed basmati rice tempered with cumin and ghee', 6.99, 'biryani'),
-- Breads
('Garlic Naan', 'Tandoor-baked flatbread brushed with garlic butter', 3.99, 'breads'),
('Butter Naan', 'Soft tandoor-baked flatbread finished with melted butter', 3.49, 'breads'),
('Tandoori Roti', 'Whole wheat flatbread baked fresh in the tandoor', 2.99, 'breads'),
('Lachha Paratha', 'Flaky, layered whole wheat flatbread', 4.49, 'breads'),
-- Desserts
('Gulab Jamun', 'Warm milk-solid dumplings soaked in rose-cardamom syrup', 4.99, 'desserts'),
('Rasmalai', 'Soft paneer discs in chilled, saffron-scented sweetened milk', 5.49, 'desserts'),
('Kheer', 'Traditional rice pudding simmered with cardamom and pistachio', 4.99, 'desserts'),
-- Beverages
('Mango Lassi', 'Chilled sweet yogurt drink with ripe mango', 4.50, 'beverages'),
('Masala Chai', 'Spiced black tea simmered with milk, ginger, and cardamom', 3.50, 'beverages'),
('Nimbu Pani', 'Refreshing Indian-style lemonade with mint and black salt', 3.25, 'beverages'),
('Thandai', 'Chilled almond-milk drink spiced with saffron and rose', 4.75, 'beverages');

INSERT INTO menu_item_profiles (menu_item_id, comfort, spicy, light, sweet, energizing)
SELECT id, 0.7, 0.3, 0.1, 0.1, 0.2 FROM menu_items WHERE name = 'Samosa'
UNION ALL SELECT id, 0.5, 0.5, 0.3, 0.0, 0.4 FROM menu_items WHERE name = 'Paneer Tikka'
UNION ALL SELECT id, 0.3, 0.9, 0.1, 0.0, 0.5 FROM menu_items WHERE name = 'Chicken 65'
UNION ALL SELECT id, 0.7, 0.3, 0.2, 0.1, 0.2 FROM menu_items WHERE name = 'Aloo Tikki'
UNION ALL SELECT id, 0.9, 0.3, 0.1, 0.2, 0.2 FROM menu_items WHERE name = 'Butter Chicken'
UNION ALL SELECT id, 0.9, 0.2, 0.1, 0.3, 0.1 FROM menu_items WHERE name = 'Paneer Butter Masala'
UNION ALL SELECT id, 0.9, 0.1, 0.1, 0.1, 0.1 FROM menu_items WHERE name = 'Dal Makhani'
UNION ALL SELECT id, 0.6, 0.1, 0.4, 0.0, 0.3 FROM menu_items WHERE name = 'Palak Paneer'
UNION ALL SELECT id, 0.6, 0.7, 0.1, 0.0, 0.3 FROM menu_items WHERE name = 'Rogan Josh'
UNION ALL SELECT id, 0.6, 0.4, 0.2, 0.0, 0.3 FROM menu_items WHERE name = 'Chole Masala'
UNION ALL SELECT id, 0.6, 0.6, 0.2, 0.0, 0.4 FROM menu_items WHERE name = 'Hyderabadi Chicken Biryani'
UNION ALL SELECT id, 0.5, 0.4, 0.3, 0.0, 0.3 FROM menu_items WHERE name = 'Vegetable Biryani'
UNION ALL SELECT id, 0.3, 0.1, 0.5, 0.0, 0.2 FROM menu_items WHERE name = 'Jeera Rice'
UNION ALL SELECT id, 0.6, 0.1, 0.2, 0.0, 0.2 FROM menu_items WHERE name = 'Garlic Naan'
UNION ALL SELECT id, 0.7, 0.0, 0.1, 0.1, 0.1 FROM menu_items WHERE name = 'Butter Naan'
UNION ALL SELECT id, 0.3, 0.0, 0.5, 0.0, 0.2 FROM menu_items WHERE name = 'Tandoori Roti'
UNION ALL SELECT id, 0.6, 0.1, 0.2, 0.1, 0.2 FROM menu_items WHERE name = 'Lachha Paratha'
UNION ALL SELECT id, 0.7, 0.0, 0.0, 1.0, 0.1 FROM menu_items WHERE name = 'Gulab Jamun'
UNION ALL SELECT id, 0.5, 0.0, 0.2, 0.9, 0.1 FROM menu_items WHERE name = 'Rasmalai'
UNION ALL SELECT id, 0.6, 0.0, 0.1, 0.8, 0.1 FROM menu_items WHERE name = 'Kheer'
UNION ALL SELECT id, 0.4, 0.0, 0.5, 0.8, 0.3 FROM menu_items WHERE name = 'Mango Lassi'
UNION ALL SELECT id, 0.5, 0.2, 0.1, 0.4, 0.6 FROM menu_items WHERE name = 'Masala Chai'
UNION ALL SELECT id, 0.1, 0.0, 0.9, 0.3, 0.4 FROM menu_items WHERE name = 'Nimbu Pani'
UNION ALL SELECT id, 0.4, 0.1, 0.4, 0.7, 0.3 FROM menu_items WHERE name = 'Thandai';

INSERT INTO inventory (menu_item_id, stock_quantity)
SELECT id, 50 FROM menu_items;
