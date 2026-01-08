// ===========================================
// ScanKart Utility Functions
// ===========================================

import crypto from 'crypto';
import type { QRPayload, BillWithItems } from './types';

/**
 * Generate HMAC-SHA256 signature for QR code data
 */
export function generateQRSignature(payload: Omit<QRPayload, 'signature'>, secret: string): string {
    const data = JSON.stringify({
        billId: payload.billId,
        billNumber: payload.billNumber,
        customerId: payload.customerId,
        storeId: payload.storeId,
        items: payload.items,
        totalAmount: payload.totalAmount,
        totalItems: payload.totalItems,
        timestamp: payload.timestamp,
        expiresAt: payload.expiresAt,
    });

    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify QR code signature
 */
export function verifyQRSignature(payload: QRPayload, secret: string): boolean {
    const { signature, ...rest } = payload;
    const expectedSignature = generateQRSignature(rest, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Check if QR code is expired
 */
export function isQRExpired(payload: QRPayload): boolean {
    return Date.now() > payload.expiresAt;
}

/**
 * Generate QR payload from bill
 */
export function generateQRPayload(
    bill: BillWithItems,
    validityMinutes: number,
    secret: string
): QRPayload {
    const timestamp = Date.now();
    const expiresAt = timestamp + validityMinutes * 60 * 1000;

    const payload: Omit<QRPayload, 'signature'> = {
        billId: bill.id,
        billNumber: bill.bill_number,
        customerId: bill.customer_id,
        storeId: bill.store_id,
        items: bill.items.map(item => ({
            productId: item.product_id,
            barcode: item.product?.barcode || '',
            name: item.product?.name || '',
            quantity: item.quantity,
            price: item.unit_price,
        })),
        totalAmount: bill.total_amount,
        totalItems: bill.total_items,
        timestamp,
        expiresAt,
    };

    const signature = generateQRSignature(payload, secret);

    return { ...payload, signature };
}

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

/**
 * Generate a simple device fingerprint
 */
export function generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return '';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('ScanKart', 2, 2);

    const data = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Indian phone number
 */
export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Calculate threshold status
 */
export function calculateThresholdStatus(
    totalAmount: number,
    totalItems: number,
    priceThreshold: number,
    quantityThreshold: number
): {
    canUseScanAndPay: boolean;
    priceExceeded: boolean;
    quantityExceeded: boolean;
    pricePercentage: number;
    quantityPercentage: number;
    warningLevel: 'none' | 'warning' | 'critical' | 'blocked';
} {
    const pricePercentage = (totalAmount / priceThreshold) * 100;
    const quantityPercentage = (totalItems / quantityThreshold) * 100;

    const priceExceeded = totalAmount > priceThreshold;
    const quantityExceeded = totalItems > quantityThreshold;
    const canUseScanAndPay = !priceExceeded && !quantityExceeded;

    let warningLevel: 'none' | 'warning' | 'critical' | 'blocked' = 'none';

    if (priceExceeded || quantityExceeded) {
        warningLevel = 'blocked';
    } else if (pricePercentage >= 90 || quantityPercentage >= 90) {
        warningLevel = 'critical';
    } else if (pricePercentage >= 70 || quantityPercentage >= 70) {
        warningLevel = 'warning';
    }

    return {
        canUseScanAndPay,
        priceExceeded,
        quantityExceeded,
        pricePercentage,
        quantityPercentage,
        warningLevel,
    };
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate random ID
 */
export function generateId(): string {
    return crypto.randomUUID?.() ||
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
}
