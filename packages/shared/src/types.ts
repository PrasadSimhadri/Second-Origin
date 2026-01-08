// ===========================================
// ScanKart Shared Types
// ===========================================

// User Types
export type UserRole = 'customer' | 'guard' | 'admin';
export type UserStatus = 'active' | 'under_review' | 'blocked';

export interface User {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role: UserRole;
    status: UserStatus;
    confirmed_flags_count: number;
    device_fingerprint?: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
}

// Store Types
export interface Store {
    id: string;
    name: string;
    code: string;
    address?: string;
    price_threshold: number;
    quantity_threshold: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Product Types
export interface Product {
    id: string;
    store_id: string;
    barcode: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    image_url?: string;
    weight_grams?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Bill Types
export type BillStatus = 'pending' | 'paid' | 'verified' | 'flagged' | 'disputed';

export interface Bill {
    id: string;
    bill_number: string;
    customer_id: string;
    store_id: string;
    status: BillStatus;
    total_amount: number;
    total_items: number;
    qr_code_data?: string;
    qr_signature?: string;
    qr_expires_at?: string;
    verified_by?: string;
    verified_at?: string;
    created_at: string;
    updated_at: string;
}

export interface BillItem {
    id: string;
    bill_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at: string;
    // Joined data
    product?: Product;
}

export interface BillWithItems extends Bill {
    items: BillItem[];
    store?: Store;
    customer?: User;
}

// Payment Types
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Payment {
    id: string;
    bill_id: string;
    amount: number;
    status: PaymentStatus;
    payment_method: string;
    transaction_id?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// Flag Types
export type FlagReason = 'item_mismatch' | 'quantity_mismatch' | 'suspected_theft' | 'invalid_qr' | 'other';
export type FlagStatus = 'pending' | 'confirmed' | 'rejected' | 'under_review';

export interface Flag {
    id: string;
    bill_id: string;
    guard_id: string;
    reason: FlagReason;
    description?: string;
    status: FlagStatus;
    evidence_urls: string[];
    resolved_by?: string;
    resolved_at?: string;
    resolution_notes?: string;
    created_at: string;
    updated_at: string;
    // Joined data
    bill?: Bill;
    guard?: User;
}

// Contradiction Types
export type ContradictionStatus = 'pending' | 'accepted' | 'rejected';

export interface Contradiction {
    id: string;
    flag_id: string;
    customer_id: string;
    reason: string;
    description?: string;
    status: ContradictionStatus;
    resolved_by?: string;
    resolved_at?: string;
    resolution_notes?: string;
    created_at: string;
    updated_at: string;
    // Joined data
    flag?: Flag;
    customer?: User;
}

// Admin Action Types
export type AdminActionType =
    | 'flag_confirmed'
    | 'flag_rejected'
    | 'contradiction_accepted'
    | 'contradiction_rejected'
    | 'user_blocked'
    | 'user_unblocked'
    | 'threshold_updated';

export interface AdminAction {
    id: string;
    admin_id: string;
    action_type: AdminActionType;
    target_type: string;
    target_id: string;
    details: Record<string, unknown>;
    created_at: string;
}

// Audit Log Types
export interface AuditLog {
    id: string;
    user_id?: string;
    action: string;
    table_name: string;
    record_id?: string;
    old_data?: Record<string, unknown>;
    new_data?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

// QR Code Types
export interface QRPayload {
    billId: string;
    billNumber: string;
    customerId: string;
    storeId: string;
    items: Array<{
        productId: string;
        barcode: string;
        name: string;
        quantity: number;
        price: number;
    }>;
    totalAmount: number;
    totalItems: number;
    timestamp: number;
    expiresAt: number;
    signature: string;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Voice Agent Types
export interface VoiceCommand {
    intent: string;
    entities: Record<string, string>;
    confidence: number;
    rawText: string;
}

export interface VoiceResponse {
    text: string;
    audioUrl?: string;
    action?: string;
    data?: Record<string, unknown>;
}

// Analytics Types
export interface Analytics {
    totalBills: number;
    totalRevenue: number;
    flaggedBillsCount: number;
    shrinkageRate: number;
    falsePositiveRate: number;
    flagsByReason: Record<FlagReason, number>;
    flagsByGuard: Array<{ guardId: string; guardName: string; count: number }>;
    topFlaggedProducts: Array<{ productId: string; productName: string; count: number }>;
}
