-- Clear existing products
DELETE FROM products;

-- Insert new products for Indian Supermarket
INSERT INTO products (store_id, name, barcode, price, category, image_url) VALUES
((SELECT id FROM stores LIMIT 1), 'Rice - 1 kg', '8901000100011', 60.00, 'Staples', 'https://via.placeholder.com/150?text=Rice+1kg'),
((SELECT id FROM stores LIMIT 1), 'Rice - 5 kg', '8901000100059', 280.00, 'Staples', 'https://via.placeholder.com/150?text=Rice+5kg'),
((SELECT id FROM stores LIMIT 1), 'Wheat Atta - 1 kg', '8901000200018', 45.00, 'Staples', 'https://via.placeholder.com/150?text=Atta+1kg'),
((SELECT id FROM stores LIMIT 1), 'Wheat Atta - 5 kg', '8901000200056', 210.00, 'Staples', 'https://via.placeholder.com/150?text=Atta+5kg'),
((SELECT id FROM stores LIMIT 1), 'Maida - 1 kg', '8901000300015', 40.00, 'Staples', 'https://via.placeholder.com/150?text=Maida'),
((SELECT id FROM stores LIMIT 1), 'Rava / Sooji - 1 kg', '8901000400012', 45.00, 'Staples', 'https://via.placeholder.com/150?text=Rava'),
((SELECT id FROM stores LIMIT 1), 'Besan - 1 kg', '8901000500019', 90.00, 'Staples', 'https://via.placeholder.com/150?text=Besan'),
((SELECT id FROM stores LIMIT 1), 'Poha - 1 kg', '8901000600016', 50.00, 'Staples', 'https://via.placeholder.com/150?text=Poha'),
((SELECT id FROM stores LIMIT 1), 'Dalia - 1 kg', '8901000700013', 55.00, 'Staples', 'https://via.placeholder.com/150?text=Dalia'),
((SELECT id FROM stores LIMIT 1), 'Multigrain Atta - 1 kg', '8901000800010', 65.00, 'Staples', 'https://via.placeholder.com/150?text=Multi+Atta'),
((SELECT id FROM stores LIMIT 1), 'Brown Rice - 1 kg', '8901000900017', 90.00, 'Staples', 'https://via.placeholder.com/150?text=Brown+Rice'),
((SELECT id FROM stores LIMIT 1), 'Basmati Rice - 1 kg', '8901001000013', 120.00, 'Staples', 'https://via.placeholder.com/150?text=Basmati'),
((SELECT id FROM stores LIMIT 1), 'Toor Dal - 1 kg', '8901001100010', 140.00, 'Pulses', 'https://via.placeholder.com/150?text=Toor+Dal'),
((SELECT id FROM stores LIMIT 1), 'Moong Dal - 1 kg', '8901001200017', 110.00, 'Pulses', 'https://via.placeholder.com/150?text=Moong+Dal'),
((SELECT id FROM stores LIMIT 1), 'Chana Dal - 1 kg', '8901001300014', 90.00, 'Pulses', 'https://via.placeholder.com/150?text=Chana+Dal'),
((SELECT id FROM stores LIMIT 1), 'Masoor Dal - 1 kg', '8901001400011', 100.00, 'Pulses', 'https://via.placeholder.com/150?text=Masoor+Dal'),
((SELECT id FROM stores LIMIT 1), 'Whole Green Moong - 1 kg', '8901001500018', 120.00, 'Pulses', 'https://via.placeholder.com/150?text=Green+Moong'),
((SELECT id FROM stores LIMIT 1), 'Kabuli Chana - 1 kg', '8901001600015', 130.00, 'Pulses', 'https://via.placeholder.com/150?text=Kabuli+Chana'),
((SELECT id FROM stores LIMIT 1), 'Black Chana - 1 kg', '8901001700012', 85.00, 'Pulses', 'https://via.placeholder.com/150?text=Black+Chana'),
((SELECT id FROM stores LIMIT 1), 'Rajma - 1 kg', '8901001800019', 125.00, 'Pulses', 'https://via.placeholder.com/150?text=Rajma'),
((SELECT id FROM stores LIMIT 1), 'Sugar - 1 kg', '8901001900016', 42.00, 'Sugar & Salt', 'https://via.placeholder.com/150?text=Sugar'),
((SELECT id FROM stores LIMIT 1), 'Salt - 1 kg', '8901002000012', 25.00, 'Sugar & Salt', 'https://via.placeholder.com/150?text=Salt'),
((SELECT id FROM stores LIMIT 1), 'Jaggery - 1 kg', '8901002100019', 60.00, 'Sugar & Salt', 'https://via.placeholder.com/150?text=Jaggery'),
((SELECT id FROM stores LIMIT 1), 'Curd - 500 g', '8901002200016', 35.00, 'Dairy', 'https://via.placeholder.com/150?text=Curd'),
((SELECT id FROM stores LIMIT 1), 'Paneer - 200 g', '8901002300013', 95.00, 'Dairy', 'https://via.placeholder.com/150?text=Paneer');
