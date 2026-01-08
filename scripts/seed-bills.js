// Script to seed test bills for demo
// Run: node scripts/seed-bills.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedBills() {
    console.log('Seeding test bills...');

    // Get a customer user
    const { data: customers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'customer')
        .limit(1);

    if (!customers || customers.length === 0) {
        console.error('No customer users found. Please create test users first.');
        process.exit(1);
    }

    const customerId = customers[0].id;

    // Get a store
    const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .limit(1);

    if (!stores || stores.length === 0) {
        console.error('No stores found. Please run seed-products.sql first.');
        process.exit(1);
    }

    const storeId = stores[0].id;

    // Get some products
    const { data: products } = await supabase
        .from('products')
        .select('id, price')
        .eq('store_id', storeId)
        .limit(5);

    if (!products || products.length === 0) {
        console.error('No products found.');
        process.exit(1);
    }

    // Create test bills
    const statuses = ['pending', 'paid', 'verified', 'flagged'];

    for (let i = 0; i < 5; i++) {
        const status = statuses[i % statuses.length];
        const billNumber = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Calculate total from random products
        const selectedProducts = products.slice(0, Math.floor(Math.random() * 3) + 1);
        const totalAmount = selectedProducts.reduce((sum, p) => sum + Number(p.price), 0);
        const totalItems = selectedProducts.length;

        const { data: bill, error: billError } = await supabase
            .from('bills')
            .insert({
                bill_number: billNumber,
                customer_id: customerId,
                store_id: storeId,
                status: status,
                total_amount: totalAmount,
                total_items: totalItems
            })
            .select()
            .single();

        if (billError) {
            console.error('Failed to create bill:', billError);
            continue;
        }

        // Add bill items
        for (const product of selectedProducts) {
            await supabase
                .from('bill_items')
                .insert({
                    bill_id: bill.id,
                    product_id: product.id,
                    quantity: 1,
                    unit_price: product.price,
                    total_price: product.price
                });
        }

        console.log(`Created bill: ${billNumber} (${status}) - ₹${totalAmount}`);
    }

    console.log('\nDone! Bills seeded successfully.');
}

seedBills().catch(console.error);
