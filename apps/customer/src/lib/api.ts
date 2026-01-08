// ===========================================
// API Client for Customer App
// ===========================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
            throw new Error(error.message || `HTTP ${response.status}`);
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
        return this.request<Bill[]>(`/bills/my${params}`);
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
        return this.request<PaymentResponse>('/payments/initiate', {
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

    // Contradictions
    async createContradiction(flagId: string, reason: string, description?: string) {
        return this.request('/contradictions', {
            method: 'POST',
            body: JSON.stringify({ flagId, reason, description }),
        });
    }

    async getMyContradictions() {
        return this.request('/contradictions/my');
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

export const api = new ApiClient();
export type { Product, Bill, BillItem, BillWithItems, ThresholdStatus, Payment };
