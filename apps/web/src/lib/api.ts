
export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    barcode: string;
    category?: string;
    image_url?: string;
    store_id?: string;
}

export interface BillItem {
    id?: string;
    product_id: string;
    quantity: number;
    price_at_time: number;
    product?: Product;
}

export interface Bill {
    id: string;
    bill_number: string;
    customer_id: string;
    status: 'pending' | 'paid' | 'verified' | 'flagged' | 'disputed';
    total_amount: number;
    total_items: number;
    created_at: string;
    items?: BillItem[];
}

export interface StoreThresholds {
    max_price: number;
    max_quantity: number;
}

export interface DashboardStats {
    totalRevenue: number;
    todayBills: number;
    shrinkageRate: number;
    activeFlags: number;
}

const API_BASE_URL = '/api/v1';

class ApiClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }

        return response.json();
    }

    // Products
    async getProductByBarcode(barcode: string): Promise<Product> {
        return this.request<Product>(`/products/barcode/${barcode}`);
    }

    async searchProducts(query: string): Promise<Product[]> {
        return this.request<Product[]>(`/products?search=${encodeURIComponent(query)}`);
    }

    async getCategories(): Promise<string[]> {
        return this.request<string[]>('/products/categories');
    }

    // Bills
    async createBill(items: { productId: string; quantity: number }[]): Promise<Bill> {
        return this.request<Bill>('/bills', {
            method: 'POST',
            body: JSON.stringify({ items }),
        });
    }

    async getBill(id: string): Promise<Bill> {
        return this.request<Bill>(`/bills/${id}`);
    }

    async getMyBills(): Promise<Bill[]> {
        return this.request<Bill[]>('/bills'); // Assuming GET /bills returns user's bills
    }

    // Admin
    async getAllBills(status?: string): Promise<Bill[]> {
        const query = status ? `?status=${status}` : '';
        return this.request<Bill[]>(`/bills${query}`); // Admin endpoint might be same but filtered by server role
    }

    async verifyBill(id: string): Promise<{ success: true }> {
        return this.request<{ success: true }>(`/bills/${id}/verify`, {
            method: 'POST',
        });
    }

    async validateQR(qrData: string): Promise<{ valid: boolean; bill?: Bill; error?: string }> {
        return this.request<{ valid: boolean; bill?: Bill; error?: string }>('/bills/validate-qr', {
            method: 'POST',
            body: JSON.stringify({ qrData }),
        });
    }

    async getQR(billId: string): Promise<{ qrCode: string; expiresAt: string }> {
        return this.request<{ qrCode: string; expiresAt: string }>(`/bills/${billId}/qr`);
    }

    // Payments
    async initiatePayment(billId: string) {
        return this.request<any>(`/payments`, {
            method: 'POST',
            body: JSON.stringify({ billId }),
        });
    }

    async verifyPayment(paymentId: string, razorpayPaymentId?: string) {
        return this.request<any>(`/payments/${paymentId}/verify`, {
            method: 'POST',
            body: JSON.stringify({ razorpayPaymentId }),
        });
    }

    // Store
    async getStoreThresholds(): Promise<StoreThresholds> {
        // Mock implementation if endpoint doesn't exist yet
        return this.request<StoreThresholds>('/store/thresholds').catch(() => ({
            max_price: 5000,
            max_quantity: 20
        }));
    }

    // Voice
    async processVoiceCommand(text: string): Promise<{ action: string; data?: any }> {
        return this.request<{ action: string; data?: any }>('/voice/command', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    }

    // Admin Analytics (Mock/Real)
    async getAnalytics(period: string): Promise<DashboardStats> {
        // Implement or return mock
        return {
            totalRevenue: 125000,
            todayBills: 45,
            shrinkageRate: 2.1,
            activeFlags: 3
        };
    }

    async getPendingFlags(): Promise<any[]> {
        return this.request<any[]>('/flags?status=pending');
    }

    async resolveFlag(id: string, action: string) {
        return this.request(`/flags/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ action }),
        });
    }

    async getPendingContradictions(): Promise<any[]> {
        // Mock or real
        return [];
    }

    async resolveContradiction(id: string, action: string) {
        // Mock
    }
}

export const api = new ApiClient();
