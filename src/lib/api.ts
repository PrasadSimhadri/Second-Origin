// ===========================================
// API Client for Frontend (Unified)
// ===========================================

// Use relative path since API routes are in the same app
const API_BASE = '/api/v1';

class ApiClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
    }

    clearToken() {
        this.token = null;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Products
    async getProducts(storeId?: string) {
        const params = storeId ? `?storeId=${storeId}` : '';
        return this.request<Product[]>(`/products${params}`);
    }

    async getProductByBarcode(barcode: string, storeId?: string) {
        const params = storeId ? `?storeId=${storeId}` : '';
        return this.request<Product>(`/products/barcode/${barcode}${params}`);
    }

    // Bills
    async createBill(storeId: string) {
        return this.request<Bill>('/bills', {
            method: 'POST',
            body: JSON.stringify({ storeId }),
        });
    }

    async getBill(billId: string) {
        return this.request<BillWithItems>(`/bills/${billId}`);
    }

    async getMyBills(status?: string) {
        const params = status ? `?status=${status}` : '';
        return this.request<Bill[]>(`/bills${params}`);
    }

    async addItem(billId: string, productId: string, quantity: number) {
        return this.request<{ item: BillItem; bill: Bill; thresholdStatus: ThresholdStatus }>(
            `/bills/${billId}/items`,
            {
                method: 'POST',
                body: JSON.stringify({ productId, quantity }),
            }
        );
    }

    async updateItem(billId: string, itemId: string, quantity: number) {
        return this.request<{ item: BillItem; bill: Bill; thresholdStatus: ThresholdStatus }>(
            `/bills/${billId}/items/${itemId}`,
            {
                method: 'PUT',
                body: JSON.stringify({ quantity }),
            }
        );
    }

    async removeItem(billId: string, itemId: string) {
        return this.request(`/bills/${billId}/items/${itemId}`, {
            method: 'DELETE',
        });
    }

    async generateQR(billId: string) {
        return this.request<{ qrData: string; expiresAt: number }>(`/bills/${billId}/qr`, {
            method: 'POST',
        });
    }

    // Payments
    async initiatePayment(billId: string) {
        return this.request<PaymentResponse>('/payments', {
            method: 'POST',
            body: JSON.stringify({ billId }),
        });
    }

    async verifyPayment(paymentId: string) {
        return this.request<{ success: boolean; payment: Payment }>(`/payments/${paymentId}/verify`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    // Guard - QR Validation
    async validateQR(qrData: string) {
        return this.request<{ valid: boolean; error?: string; bill?: Bill; payload?: unknown }>(
            '/bills/validate-qr',
            {
                method: 'POST',
                body: JSON.stringify({ qrData }),
            }
        );
    }

    async verifyBill(billId: string) {
        return this.request<Bill>(`/bills/${billId}/verify`, {
            method: 'POST',
        });
    }

    // Flags
    async createFlag(billId: string, reason: string, description?: string) {
        return this.request('/flags', {
            method: 'POST',
            body: JSON.stringify({ billId, reason, description }),
        });
    }

    async getFlags() {
        return this.request<Flag[]>('/flags');
    }

    async addEvidence(flagId: string, imageData: string) {
        return this.request(`/flags/${flagId}/evidence`, {
            method: 'POST',
            body: JSON.stringify({ imageData }),
        });
    }

    // Voice
    async getVoiceToken(room?: string) {
        const params = room ? `?room=${room}` : '';
        return this.request<{ token: string; roomName: string; url: string }>(`/voice/token${params}`);
    }

    async processVoiceCommand(text: string, state?: unknown, billId?: string) {
        return this.request<{ text: string; action?: string; state: unknown }>(
            '/voice/command',
            {
                method: 'POST',
                body: JSON.stringify({ text, state, billId }),
            }
        );
    }

    // Auth
    async register(email: string, password: string, fullName: string, phone?: string) {
        return this.request<{ user: unknown; session: unknown }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName, phone }),
        });
    }

    async login(email: string, password: string) {
        return this.request<{ user: unknown; profile: unknown; session: { access_token: string } }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async getProfile() {
        return this.request<UserProfile>('/auth/profile');
    }

    // Admin API Methods
    async getAnalytics(storeId?: string) {
        const params = storeId ? `?storeId=${storeId}` : '';
        return this.request<Analytics>(`/admin/analytics${params}`);
    }

    async getStores() {
        return this.request<Store[]>('/admin/stores');
    }

    async updateThresholds(storeId: string, priceThreshold?: number, quantityThreshold?: number) {
        return this.request<Store>('/admin/stores', {
            method: 'PUT',
            body: JSON.stringify({ storeId, priceThreshold, quantityThreshold }),
        });
    }

    async getPendingFlags() {
        return this.request<Flag[]>('/flags');
    }

    async resolveFlag(flagId: string, action: 'confirm' | 'reject', notes?: string) {
        return this.request(`/flags/${flagId}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ action, notes }),
        });
    }

    async getPendingContradictions() {
        return [] as Contradiction[];
    }

    async resolveContradiction(contradictionId: string, action: 'accept' | 'reject', notes?: string) {
        return {};
    }

    async getAllBills(status?: string) {
        const params = status ? `?status=${status}` : '';
        return this.request<BillWithDetails[]>(`/bills${params}`);
    }

    async getUsers(role?: string) {
        const params = role ? `?role=${role}` : '';
        return this.request<User[]>(`/admin/users${params}`);
    }

    async updateUserStatus(userId: string, action: 'block' | 'unblock', reason?: string) {
        return this.request('/admin/users', {
            method: 'PUT',
            body: JSON.stringify({ userId, action, reason }),
        });
    }
}

// Types
interface Product {
    id: string;
    barcode: string;
    name: string;
    price: number;
    category?: string;
    image_url?: string;
}

interface Bill {
    id: string;
    bill_number: string;
    status: string;
    total_amount: number;
    total_items: number;
    created_at: string;
}

interface BillItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product?: Product;
}

interface BillWithItems extends Bill {
    items: BillItem[];
    store?: { name: string; price_threshold: number; quantity_threshold: number };
}

interface ThresholdStatus {
    canUseScanAndPay: boolean;
    priceExceeded: boolean;
    quantityExceeded: boolean;
    pricePercentage: number;
    quantityPercentage: number;
    warningLevel: 'none' | 'warning' | 'critical' | 'blocked';
}

interface PaymentResponse {
    payment: Payment;
    orderId: string;
    amount: number;
    options: Record<string, unknown>;
}

interface Payment {
    id: string;
    bill_id: string;
    amount: number;
    status: string;
}

interface Flag {
    id: string;
    bill_id: string;
    reason: string;
    status: string;
    created_at: string;
    description?: string;
    evidence_urls?: string[];
    bill?: BillWithDetails;
    guard?: User;
}

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: 'customer' | 'guard' | 'admin';
    status: string;
}

// Admin Types
interface Analytics {
    totalBills: number;
    totalRevenue: number;
    flaggedBillsCount: number;
    confirmedFlags: number;
    rejectedFlags: number;
    shrinkageRate: number;
    falsePositiveRate: number;
    flagsByReason: Record<string, number>;
    flagsByGuard: Array<{ guardId: string; guardName: string; count: number }>;
}

interface Store {
    id: string;
    name: string;
    code: string;
    price_threshold: number;
    quantity_threshold: number;
}

interface User {
    id: string;
    email: string;
    full_name: string;
    status: string;
    role: string;
    confirmed_flags_count?: number;
}

interface BillWithDetails extends Bill {
    customer?: User;
    items?: Array<{ quantity: number; product: { name: string } }>;
}

interface Contradiction {
    id: string;
    reason: string;
    description: string;
    status: string;
    created_at: string;
    flag?: Flag;
    customer?: User;
}

export const api = new ApiClient();
export type { Product, Bill, BillItem, BillWithItems, ThresholdStatus, Payment, Flag, UserProfile, Analytics, Store, User, BillWithDetails, Contradiction };
