-- ===========================================
-- ScanKart Database Schema
-- Migration: 001_initial_schema
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ENUM Types
-- ===========================================

CREATE TYPE user_role AS ENUM ('customer', 'guard', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'under_review', 'blocked');
CREATE TYPE bill_status AS ENUM ('pending', 'paid', 'verified', 'flagged', 'disputed');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE flag_reason AS ENUM ('item_mismatch', 'quantity_mismatch', 'suspected_theft', 'invalid_qr', 'other');
CREATE TYPE flag_status AS ENUM ('pending', 'confirmed', 'rejected', 'under_review');
CREATE TYPE contradiction_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE admin_action_type AS ENUM ('flag_confirmed', 'flag_rejected', 'contradiction_accepted', 'contradiction_rejected', 'user_blocked', 'user_unblocked', 'threshold_updated');

-- ===========================================
-- Tables
-- ===========================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    status user_status NOT NULL DEFAULT 'active',
    confirmed_flags_count INTEGER DEFAULT 0,
    device_fingerprint TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores table (for multi-store support)
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    price_threshold DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    quantity_threshold INTEGER NOT NULL DEFAULT 20,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT,
    image_url TEXT,
    weight_grams INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, barcode)
);

-- Bills table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    status bill_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_items INTEGER NOT NULL DEFAULT 0,
    qr_code_data TEXT,
    qr_signature TEXT,
    qr_expires_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill Items table
CREATE TABLE bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT DEFAULT 'upi',
    transaction_id TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flags table (guard-raised flags)
CREATE TABLE flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    guard_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason flag_reason NOT NULL,
    description TEXT,
    status flag_status NOT NULL DEFAULT 'pending',
    evidence_urls TEXT[] DEFAULT '{}',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contradictions table (customer disputes)
CREATE TABLE contradictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_id UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status contradiction_status NOT NULL DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Actions table
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type admin_action_type NOT NULL,
    target_type TEXT NOT NULL, -- 'flag', 'contradiction', 'user', 'store'
    target_id UUID NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Indexes for Performance
-- ===========================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_bills_customer ON bills(customer_id);
CREATE INDEX idx_bills_store ON bills(store_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_created ON bills(created_at DESC);
CREATE INDEX idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX idx_payments_bill ON payments(bill_id);
CREATE INDEX idx_flags_bill ON flags(bill_id);
CREATE INDEX idx_flags_guard ON flags(guard_id);
CREATE INDEX idx_flags_status ON flags(status);
CREATE INDEX idx_contradictions_flag ON contradictions(flag_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ===========================================
-- Row Level Security Policies
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- Users Policies
-- ===========================================

-- Users can read their own profile
CREATE POLICY "users_read_own" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Guards can read customer profiles for verification
CREATE POLICY "guards_read_customers" ON users
    FOR SELECT USING (
        get_user_role(auth.uid()) = 'guard' AND role = 'customer'
    );

-- Admins can read all users
CREATE POLICY "admins_read_all_users" ON users
    FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Admins can update all users
CREATE POLICY "admins_update_all_users" ON users
    FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Stores Policies
-- ===========================================

-- All authenticated users can read stores
CREATE POLICY "all_read_stores" ON stores
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can modify stores
CREATE POLICY "admins_manage_stores" ON stores
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Products Policies
-- ===========================================

-- All authenticated users can read active products
CREATE POLICY "all_read_products" ON products
    FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- Admins can manage products
CREATE POLICY "admins_manage_products" ON products
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Bills Policies
-- ===========================================

-- Customers can read their own bills
CREATE POLICY "customers_read_own_bills" ON bills
    FOR SELECT USING (auth.uid() = customer_id);

-- Customers can create bills
CREATE POLICY "customers_create_bills" ON bills
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id AND 
        get_user_role(auth.uid()) = 'customer'
    );

-- Customers can update their pending bills
CREATE POLICY "customers_update_own_pending_bills" ON bills
    FOR UPDATE USING (
        auth.uid() = customer_id AND 
        status IN ('pending', 'paid')
    );

-- Guards can read all bills for verification
CREATE POLICY "guards_read_bills" ON bills
    FOR SELECT USING (get_user_role(auth.uid()) = 'guard');

-- Guards can update bill status (verify)
CREATE POLICY "guards_verify_bills" ON bills
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'guard' AND
        status = 'paid'
    );

-- Admins have full access to bills
CREATE POLICY "admins_manage_bills" ON bills
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Bill Items Policies
-- ===========================================

-- Users can read items of their own bills
CREATE POLICY "customers_read_own_bill_items" ON bill_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bills 
            WHERE bills.id = bill_items.bill_id 
            AND bills.customer_id = auth.uid()
        )
    );

-- Customers can add items to their pending bills
CREATE POLICY "customers_create_bill_items" ON bill_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bills 
            WHERE bills.id = bill_items.bill_id 
            AND bills.customer_id = auth.uid()
            AND bills.status = 'pending'
        )
    );

-- Guards can read bill items
CREATE POLICY "guards_read_bill_items" ON bill_items
    FOR SELECT USING (get_user_role(auth.uid()) = 'guard');

-- Admins have full access
CREATE POLICY "admins_manage_bill_items" ON bill_items
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Payments Policies
-- ===========================================

-- Customers can read their own payments
CREATE POLICY "customers_read_own_payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bills 
            WHERE bills.id = payments.bill_id 
            AND bills.customer_id = auth.uid()
        )
    );

-- Customers can create payments for their bills
CREATE POLICY "customers_create_payments" ON payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bills 
            WHERE bills.id = payments.bill_id 
            AND bills.customer_id = auth.uid()
        )
    );

-- Admins have full access
CREATE POLICY "admins_manage_payments" ON payments
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Flags Policies
-- ===========================================

-- Guards can create flags
CREATE POLICY "guards_create_flags" ON flags
    FOR INSERT WITH CHECK (
        auth.uid() = guard_id AND
        get_user_role(auth.uid()) = 'guard'
    );

-- Guards can read their own flags
CREATE POLICY "guards_read_own_flags" ON flags
    FOR SELECT USING (guard_id = auth.uid());

-- Guards can update their pending flags
CREATE POLICY "guards_update_own_flags" ON flags
    FOR UPDATE USING (
        guard_id = auth.uid() AND 
        status = 'pending'
    );

-- Customers can read flags on their bills
CREATE POLICY "customers_read_own_flags" ON flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bills 
            WHERE bills.id = flags.bill_id 
            AND bills.customer_id = auth.uid()
        )
    );

-- Admins have full access
CREATE POLICY "admins_manage_flags" ON flags
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Contradictions Policies
-- ===========================================

-- Customers can create contradictions for flags on their bills
CREATE POLICY "customers_create_contradictions" ON contradictions
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id AND
        EXISTS (
            SELECT 1 FROM flags f
            JOIN bills b ON b.id = f.bill_id
            WHERE f.id = contradictions.flag_id
            AND b.customer_id = auth.uid()
        )
    );

-- Customers can read their own contradictions
CREATE POLICY "customers_read_own_contradictions" ON contradictions
    FOR SELECT USING (customer_id = auth.uid());

-- Admins have full access
CREATE POLICY "admins_manage_contradictions" ON contradictions
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Admin Actions Policies
-- ===========================================

-- Only admins can create and read admin actions
CREATE POLICY "admins_manage_admin_actions" ON admin_actions
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Audit Logs Policies
-- ===========================================

-- Only admins can read audit logs
CREATE POLICY "admins_read_audit_logs" ON audit_logs
    FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- ===========================================
-- Trigger Functions
-- ===========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_flags_updated_at BEFORE UPDATE ON flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contradictions_updated_at BEFORE UPDATE ON contradictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.bill_number = 'SK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
        LPAD(NEXTVAL('bill_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS bill_number_seq START 1;

CREATE TRIGGER generate_bill_number_trigger BEFORE INSERT ON bills
    FOR EACH ROW EXECUTE FUNCTION generate_bill_number();

-- Auto-calculate bill totals
CREATE OR REPLACE FUNCTION update_bill_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bills SET
        total_amount = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM bill_items WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)
        ),
        total_items = (
            SELECT COALESCE(SUM(quantity), 0) 
            FROM bill_items WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)
        )
    WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bill_totals_on_insert AFTER INSERT ON bill_items
    FOR EACH ROW EXECUTE FUNCTION update_bill_totals();
CREATE TRIGGER update_bill_totals_on_update AFTER UPDATE ON bill_items
    FOR EACH ROW EXECUTE FUNCTION update_bill_totals();
CREATE TRIGGER update_bill_totals_on_delete AFTER DELETE ON bill_items
    FOR EACH ROW EXECUTE FUNCTION update_bill_totals();

-- ===========================================
-- Seed Default Store
-- ===========================================

INSERT INTO stores (id, name, code, address, price_threshold, quantity_threshold)
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'ScanKart Demo Store',
    'DEMO001',
    'Avinashi Road, Coimbatore, Tamil Nadu 641006',
    5000.00,
    20
);
