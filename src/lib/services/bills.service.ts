// ===========================================
// Bills Service - Migrated from NestJS
// ===========================================

import { getAdminClient } from '@/lib/supabase';
import * as crypto from 'crypto';

interface Store {
    id: string;
    price_threshold: number;
    quantity_threshold: number;
}

interface Product {
    id: string;
    name: string;
    barcode: string;
    price: number;
}

interface BillItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product?: Product;
}

interface Bill {
    id: string;
    bill_number: string;
    customer_id: string;
    store_id: string;
    status: string;
    total_amount: number;
    total_items: number;
    items?: BillItem[];
    store?: Store;
}

export interface CreateBillDto {
    storeId: string;
}

export interface AddItemDto {
    productId: string;
    quantity: number;
}

export interface UpdateItemDto {
    quantity: number;
}

export class BillsService {
    static async create(userId: string, dto: CreateBillDto) {
        const client = getAdminClient();

        // Verify store exists
        const { data: store, error: storeError } = await client
            .from('stores')
            .select('*')
            .eq('id', dto.storeId)
            .eq('is_active', true)
            .single();

        if (storeError || !store) {
            throw new Error('Store not found');
        }

        // Create bill
        const { data: bill, error } = await client
            .from('bills')
            .insert({
                customer_id: userId,
                store_id: dto.storeId,
                status: 'pending',
            })
            .select()
            .single();

        if (error) {
            throw new Error('Failed to create bill');
        }

        return bill;
    }

    static async findById(billId: string, userId?: string, userRole?: string) {
        const client = getAdminClient();

        const { data: bill, error } = await client
            .from('bills')
            .select(`
                *,
                store:stores(*),
                items:bill_items(
                    *,
                    product:products(*)
                )
            `)
            .eq('id', billId)
            .single();

        if (error || !bill) {
            throw new Error('Bill not found');
        }

        // Check access for customers
        if (userRole === 'customer' && bill.customer_id !== userId) {
            throw new Error('Access denied');
        }

        return bill;
    }

    static async findByUser(userId: string, status?: string) {
        const client = getAdminClient();

        let query = client
            .from('bills')
            .select(`
                *,
                store:stores(name, code),
                items:bill_items(count)
            `)
            .eq('customer_id', userId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error('Failed to fetch bills');
        }

        return data;
    }

    static async addItem(billId: string, userId: string, dto: AddItemDto) {
        const client = getAdminClient();

        // Get bill and verify ownership
        const bill = await this.findById(billId, userId, 'customer') as Bill;

        if (bill.status !== 'pending') {
            throw new Error('Cannot modify a non-pending bill');
        }

        // Get product
        const { data: product, error: productError } = await client
            .from('products')
            .select('*')
            .eq('id', dto.productId)
            .eq('is_active', true)
            .single();

        if (productError || !product) {
            throw new Error('Product not found');
        }

        // Check if item already exists
        const { data: existingItem } = await client
            .from('bill_items')
            .select('*')
            .eq('bill_id', billId)
            .eq('product_id', dto.productId)
            .single();

        if (existingItem) {
            // Update quantity
            const newQuantity = existingItem.quantity + dto.quantity;
            return this.updateItem(billId, existingItem.id, userId, { quantity: newQuantity });
        }

        // Add new item
        const { data: item, error } = await client
            .from('bill_items')
            .insert({
                bill_id: billId,
                product_id: dto.productId,
                quantity: dto.quantity,
                unit_price: product.price,
                total_price: product.price * dto.quantity,
            })
            .select(`*, product:products(*)`)
            .single();

        if (error) {
            throw new Error('Failed to add item');
        }

        // Check thresholds
        const updatedBill = await this.findById(billId, userId, 'customer');
        const thresholdStatus = this.checkThresholds(updatedBill as Bill);

        return { item, bill: updatedBill, thresholdStatus };
    }

    static async updateItem(billId: string, itemId: string, userId: string, dto: UpdateItemDto) {
        const client = getAdminClient();

        // Verify bill ownership
        const bill = await this.findById(billId, userId, 'customer') as Bill;

        if (bill.status !== 'pending') {
            throw new Error('Cannot modify a non-pending bill');
        }

        if (dto.quantity === 0) {
            // Delete item
            await client.from('bill_items').delete().eq('id', itemId);
            const updatedBill = await this.findById(billId, userId, 'customer');
            return { deleted: true, bill: updatedBill };
        }

        // Get item and update
        const { data: item, error: itemError } = await client
            .from('bill_items')
            .select('*, product:products(*)')
            .eq('id', itemId)
            .single();

        if (itemError || !item) {
            throw new Error('Item not found');
        }

        const { data: updatedItem, error } = await client
            .from('bill_items')
            .update({
                quantity: dto.quantity,
                total_price: item.unit_price * dto.quantity,
            })
            .eq('id', itemId)
            .select(`*, product:products(*)`)
            .single();

        if (error) {
            throw new Error('Failed to update item');
        }

        const updatedBill = await this.findById(billId, userId, 'customer');
        const thresholdStatus = this.checkThresholds(updatedBill as Bill);

        return { item: updatedItem, bill: updatedBill, thresholdStatus };
    }

    static async removeItem(billId: string, itemId: string, userId: string) {
        return this.updateItem(billId, itemId, userId, { quantity: 0 });
    }

    static checkThresholds(bill: Bill) {
        const store = bill.store as Store;
        const priceThreshold = store?.price_threshold || 5000;
        const quantityThreshold = store?.quantity_threshold || 20;

        const pricePercentage = (bill.total_amount / priceThreshold) * 100;
        const quantityPercentage = (bill.total_items / quantityThreshold) * 100;

        const priceExceeded = bill.total_amount > priceThreshold;
        const quantityExceeded = bill.total_items > quantityThreshold;
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
            pricePercentage: Math.round(pricePercentage),
            quantityPercentage: Math.round(quantityPercentage),
            priceThreshold,
            quantityThreshold,
            warningLevel,
        };
    }

    static async generateQR(billId: string, userId: string) {
        const client = getAdminClient();
        const bill = await this.findById(billId, userId, 'customer') as Bill;

        if (bill.status !== 'paid') {
            throw new Error('Bill must be paid before generating QR');
        }

        const thresholdStatus = this.checkThresholds(bill);
        if (!thresholdStatus.canUseScanAndPay) {
            throw new Error('Scan-and-Pay not allowed: threshold exceeded');
        }

        const validityMinutes = parseInt(process.env.BILL_VALIDITY_MINUTES || '30');
        const secret = process.env.QR_SIGNING_SECRET || 'scankart-qr-secret';

        const timestamp = Date.now();
        const expiresAt = timestamp + validityMinutes * 60 * 1000;

        const payload = {
            billId: bill.id,
            billNumber: bill.bill_number,
            customerId: bill.customer_id,
            storeId: bill.store_id,
            items: (bill.items || []).map((item: BillItem) => ({
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

        const signature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        const qrPayload = { ...payload, signature };
        const qrData = JSON.stringify(qrPayload);

        // Store QR data in bill
        await client
            .from('bills')
            .update({
                qr_code_data: qrData,
                qr_signature: signature,
                qr_expires_at: new Date(expiresAt).toISOString(),
            })
            .eq('id', billId);

        return { qrData, expiresAt, payload: qrPayload };
    }

    static async validateQR(qrData: string) {
        const secret = process.env.QR_SIGNING_SECRET || 'scankart-qr-secret';

        try {
            const payload = JSON.parse(qrData);

            // Check expiry
            if (Date.now() > payload.expiresAt) {
                return { valid: false, error: 'QR code has expired', bill: null };
            }

            // Verify signature
            const { signature, ...rest } = payload;
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(rest))
                .digest('hex');

            if (signature !== expectedSignature) {
                return { valid: false, error: 'Invalid QR signature', bill: null };
            }

            // Get current bill data
            const bill = await this.findById(payload.billId);

            return { valid: true, payload, bill };
        } catch {
            return { valid: false, error: 'Invalid QR format', bill: null };
        }
    }

    static async verifyBill(billId: string, guardId: string) {
        const client = getAdminClient();

        const { data, error } = await client
            .from('bills')
            .update({
                status: 'verified',
                verified_by: guardId,
                verified_at: new Date().toISOString(),
            })
            .eq('id', billId)
            .eq('status', 'paid')
            .select()
            .single();

        if (error || !data) {
            throw new Error('Failed to verify bill');
        }

        return data;
    }
}
