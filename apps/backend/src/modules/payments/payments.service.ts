// ===========================================
// Payments Service (Mock Implementation)
// ===========================================

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

export class InitiatePaymentDto {
    billId: string;
    paymentMethod?: string;
}

@Injectable()
export class PaymentsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Initiate payment (mock)
     */
    async initiatePayment(userId: string, dto: InitiatePaymentDto) {
        const client = this.supabaseService.getAdminClient();

        // Get bill
        const { data: bill, error: billError } = await client
            .from('bills')
            .select('*')
            .eq('id', dto.billId)
            .eq('customer_id', userId)
            .single();

        if (billError || !bill) {
            throw new NotFoundException('Bill not found');
        }

        if (bill.status !== 'pending') {
            throw new BadRequestException('Bill is not pending payment');
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
            throw new BadRequestException('Failed to initiate payment');
        }

        return {
            payment,
            orderId: razorpayOrderId,
            amount: bill.total_amount,
            currency: 'INR',
            // Mock Razorpay checkout options
            options: {
                key: 'rzp_test_mock',
                amount: bill.total_amount * 100, // In paise
                currency: 'INR',
                name: 'ScanKart',
                description: `Bill #${bill.bill_number}`,
                order_id: razorpayOrderId,
            },
        };
    }

    /**
     * Verify/Complete payment (mock - always succeeds)
     */
    async verifyPayment(userId: string, paymentId: string, razorpayPaymentId?: string) {
        const client = this.supabaseService.getAdminClient();

        // Get payment
        const { data: payment, error: paymentError } = await client
            .from('payments')
            .select('*, bill:bills(*)')
            .eq('id', paymentId)
            .single();

        if (paymentError || !payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.bill.customer_id !== userId) {
            throw new BadRequestException('Unauthorized');
        }

        if (payment.status !== 'pending') {
            throw new BadRequestException('Payment already processed');
        }

        // Mock verification - always succeed
        const transactionId = `txn_${uuidv4().slice(0, 14)}`;
        const mockPaymentId = razorpayPaymentId || `pay_${uuidv4().slice(0, 14)}`;

        // Update payment
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
            throw new BadRequestException('Failed to verify payment');
        }

        // Update bill status
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

    /**
     * Get payment by bill
     */
    async getByBill(userId: string, billId: string) {
        const client = this.supabaseService.getAdminClient();

        const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('bill_id', billId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new BadRequestException('Failed to fetch payments');
        }

        return data;
    }
}
