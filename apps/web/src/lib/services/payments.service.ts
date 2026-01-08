// ===========================================
// Payments Service - Migrated from NestJS
// ===========================================

import { getAdminClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface InitiatePaymentDto {
    billId: string;
    paymentMethod?: string;
}

export class PaymentsService {
    static async initiatePayment(userId: string, dto: InitiatePaymentDto) {
        const client = getAdminClient();

        // Get bill
        const { data: bill, error: billError } = await client
            .from('bills')
            .select('*')
            .eq('id', dto.billId)
            .eq('customer_id', userId)
            .single();

        if (billError || !bill) {
            throw new Error('Bill not found');
        }

        if (bill.status !== 'pending') {
            throw new Error('Bill is not pending payment');
        }

        // Create mock payment
        const razorpayOrderId = `order_${uuidv4().slice(0, 14)}`;

        const { data: payment, error } = await client
            .from('payments')
            .insert({
                bill_id: dto.billId,
                amount: bill.total_amount,
                status: 'pending',
                payment_method: dto.paymentMethod || 'upi',
                razorpay_order_id: razorpayOrderId,
                metadata: {
                    initiated_at: new Date().toISOString(),
                    mock: true,
                },
            })
            .select()
            .single();

        if (error) {
            throw new Error('Failed to initiate payment');
        }

        return {
            payment,
            orderId: razorpayOrderId,
            amount: bill.total_amount,
            currency: 'INR',
            options: {
                key: 'rzp_test_mock',
                amount: bill.total_amount * 100,
                currency: 'INR',
                name: 'ScanKart',
                description: `Bill #${bill.bill_number}`,
                order_id: razorpayOrderId,
            },
        };
    }

    static async verifyPayment(userId: string, paymentId: string, razorpayPaymentId?: string) {
        const client = getAdminClient();

        // Get payment
        const { data: payment, error: paymentError } = await client
            .from('payments')
            .select('*, bill:bills(*)')
            .eq('id', paymentId)
            .single();

        if (paymentError || !payment) {
            throw new Error('Payment not found');
        }

        if (payment.bill.customer_id !== userId) {
            throw new Error('Unauthorized');
        }

        if (payment.status !== 'pending') {
            throw new Error('Payment already processed');
        }

        const transactionId = `txn_${uuidv4().slice(0, 14)}`;
        const mockPaymentId = razorpayPaymentId || `pay_${uuidv4().slice(0, 14)}`;

        const { data: updatedPayment, error: updateError } = await client
            .from('payments')
            .update({
                status: 'completed',
                transaction_id: transactionId,
                razorpay_payment_id: mockPaymentId,
                metadata: {
                    ...payment.metadata,
                    verified_at: new Date().toISOString(),
                },
            })
            .eq('id', paymentId)
            .select()
            .single();

        if (updateError) {
            throw new Error('Failed to verify payment');
        }

        await client
            .from('bills')
            .update({ status: 'paid' })
            .eq('id', payment.bill_id);

        return {
            success: true,
            payment: updatedPayment,
            transactionId,
            message: 'Payment successful',
        };
    }

    static async getByBill(userId: string, billId: string) {
        const client = getAdminClient();

        const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('bill_id', billId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error('Failed to fetch payments');
        }

        return data;
    }
}
