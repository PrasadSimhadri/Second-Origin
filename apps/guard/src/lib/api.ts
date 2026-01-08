// ===========================================
// API Client for Guard App
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

    // Bill Verification
    async validateQR(qrData: string) {
        return this.request<QRValidationResult>('/bills/validate-qr', {
            method: 'POST',
            body: JSON.stringify({ qrData }),
        });
    }

    async verifyBill(billId: string) {
        return this.request<Bill>(`/bills/${billId}/verify`, {
            method: 'POST',
        });
    }

    async getBill(billId: string) {
        return this.request<BillWithItems>(`/bills/${billId}`);
    }

    // Flags
    async createFlag(billId: string, reason: FlagReason, description?: string) {
        return this.request<Flag>('/flags', {
            method: 'POST',
            body: JSON.stringify({ billId, reason, description }),
        });
    }

    async addEvidence(flagId: string, imageData: string) {
        return this.request<{ success: boolean; url: string }>(`/flags/${flagId}/evidence`, {
            method: 'POST',
            body: JSON.stringify({ imageData }),
        });
    }

    async getMyFlags() {
        return this.request<Flag[]>('/flags/my');
    }

    // Voice
    async getVoiceToken(roomName?: string) {
        const params = roomName ? `?room=${roomName}` : '';
        return this.request<{ token: string; roomName: string; url: string }>(`/voice/token${params}`);
    }

    async processVoiceCommand(text: string, billId?: string) {
        return this.request<VoiceResponse>('/voice/command', {
            method: 'POST',
            body: JSON.stringify({ text, billId }),
        });
    }
}

// Types
type FlagReason = 'item_mismatch' | 'quantity_mismatch' | 'suspected_theft' | 'invalid_qr' | 'other';

interface Product {
    id: string;
    barcode: string;
    name: string;
    price: number;
    category?: string;
}

interface Bill {
    id: string;
    bill_number: string;
    customer_id: string;
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
    customer?: { id: string; full_name: string; email: string };
}

interface QRValidationResult {
    valid: boolean;
    error?: string;
    payload?: {
        billId: string;
        billNumber: string;
        totalAmount: number;
        totalItems: number;
        items: Array<{ name: string; quantity: number; price: number }>;
        expiresAt: number;
    };
    bill?: BillWithItems;
}

interface Flag {
    id: string;
    bill_id: string;
    reason: FlagReason;
    description?: string;
    status: string;
    evidence_urls: string[];
    created_at: string;
    bill?: Bill;
}

interface VoiceResponse {
    text: string;
    audioUrl?: string;
    action?: string;
    data?: Record<string, unknown>;
}

export const api = new ApiClient();
export type { Product, Bill, BillItem, BillWithItems, QRValidationResult, Flag, FlagReason, VoiceResponse };
