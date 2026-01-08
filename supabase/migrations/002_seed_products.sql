-- ===========================================
-- ScanKart Seed Data
-- Migration: 002_seed_products
-- ===========================================

-- ===========================================
-- Seed Sample Products (20 items for Phase 1)
-- ===========================================

INSERT INTO products (store_id, barcode, name, description, price, category, weight_grams) VALUES
-- Groceries
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901030865824', 'Tata Salt (1kg)', 'Iodized table salt', 28.00, 'Groceries', 1000),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901725181239', 'Aashirvaad Atta (5kg)', 'Whole wheat flour', 295.00, 'Groceries', 5000),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901063010116', 'Fortune Sunflower Oil (1L)', 'Refined sunflower oil', 145.00, 'Groceries', 1000),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901030584732', 'Tata Tea Gold (500g)', 'Premium tea leaves', 285.00, 'Beverages', 500),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901719110016', 'India Gate Basmati Rice (1kg)', 'Premium aged basmati rice', 175.00, 'Groceries', 1000),

-- Dairy
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901057022023', 'Amul Toned Milk (1L)', 'Fresh toned milk', 60.00, 'Dairy', 1030),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901057001004', 'Amul Butter (500g)', 'Pasteurized butter', 280.00, 'Dairy', 500),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901057420314', 'Amul Cheese Slices (200g)', 'Processed cheese slices', 135.00, 'Dairy', 200),

-- Snacks & Instant Food
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901491101325', 'Maggi 2-Minute Noodles (Pack of 8)', 'Instant noodles family pack', 112.00, 'Snacks', 560),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901491501224', 'Lays Classic Salted (95g)', 'Potato chips', 40.00, 'Snacks', 95),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901063204201', 'Parle-G Biscuits (800g)', 'Glucose biscuits family pack', 85.00, 'Snacks', 800),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8902102101684', 'Britannia Marie Gold (300g)', 'Light tea biscuits', 55.00, 'Snacks', 300),

-- Beverages
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901245115421', 'Coca-Cola (2L)', 'Carbonated soft drink', 95.00, 'Beverages', 2100),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901030519611', 'Tropicana Orange Juice (1L)', 'Pure orange juice', 110.00, 'Beverages', 1050),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901057453127', 'Bisleri Water (1L)', 'Packaged drinking water', 20.00, 'Beverages', 1000),

-- Personal Care
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901314010100', 'Colgate MaxFresh (150g)', 'Gel toothpaste', 95.00, 'Personal Care', 150),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901030010637', 'Dettol Original Soap (75g x 4)', 'Antibacterial soap', 180.00, 'Personal Care', 300),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901057400514', 'Dove Shampoo (340ml)', 'Hair shampoo', 299.00, 'Personal Care', 380),

-- Household
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901030006302', 'Surf Excel Matic (2kg)', 'Front load detergent', 425.00, 'Household', 2000),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', '8901030001055', 'Vim Dishwash Bar (500g)', 'Dishwashing soap', 55.00, 'Household', 500);

-- ===========================================
-- Note: User creation happens through Supabase Auth
-- Admin users should be created manually and updated in users table
-- ===========================================
