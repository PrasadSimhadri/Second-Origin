// ===========================================
// API Client for Admin App
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

    // Analytics
    async getAnalytics(storeId?: string) {
        const params = storeId ? `?storeId=${storeId}` : '';
        return this.request<Analytics>(`/admin/analytics${params}`);
    }

    // Thresholds
    async getStores() {
        return this.request<Store[]>('/admin/stores');
    }

    async updateThresholds(storeId: string, priceThreshold?: number, quantityThreshold?: number) {
        return this.request<Store>('/admin/thresholds', {
            method: 'PUT',
            body: JSON.stringify({ storeId, priceThreshold, quantityThreshold }),
        });
    }

    // Flags & Contradictions
    async getPendingFlags() {
        return this.request<Flag[]>('/flags/pending');
    }

    async resolveFlag(flagId: string, action: 'confirm' | 'reject', notes?: string) {
        return this.request(`/admin/flags/${flagId}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ action, notes }),
        });
    }

    async getPendingContradictions() {
        return this.request<Contradiction[]>('/contradictions/pending');
    }

    async resolveContradiction(contradictionId: string, action: 'accept' | 'reject', notes?: string) {
        return this.request(`/admin/contradictions/${contradictionId}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ action, notes }),
        });
    }

    // Bills
    async getAllBills(status?: string) {
        const params = status ? `?status=${status}` : '';
        return this.request<BillWithDetails[]>(`/admin/bills${params}`);
    }

    // Users
    async getUsers(role?: string) {
        const params = role ? `?role=${role}` : '';
        return this.request<User[]>(`/admin/users${params}`);
    }

    async updateUserStatus(userId: string, action: 'block' | 'unblock', reason?: string) {
        return this.request(`/admin/users/${userId}/status`, {
            method: 'POST',
            body: JSON.stringify({ action, reason }),
        });
    }
}

// Types
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

interface Flag {
    id: string;
    reason: string;
    description: string;
    evidence_urls: string[];
    created_at: string;
    bill: BillWithDetails;
    guard: User;
}

interface Contradiction {
    id: string;
    reason: string;
    description: string;
    status: string;
    created_at: string;
    flag: Flag;
    customer: User;
}

interface BillWithDetails {
    id: string;
    bill_number: string;
    total_amount: number;
    total_items: number;
    status: string;
    created_at: string;
    customer: User;
    items?: Array<{ quantity: number; product: { name: string } }>;
}

interface User {
    id: string;
    email: string;
    full_name: string;
    status: string;
    role: string;
    confirmed_flags_count?: number;
}

export const api = new ApiClient();
export type { Analytics, Store, Flag, Contradiction, BillWithDetails, User };
