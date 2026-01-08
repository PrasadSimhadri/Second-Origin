'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api, type BillWithItems } from '@/lib/api';
import QRCode from 'qrcode';

export default function CheckoutPage({ params }: { params: Promise<{ billId: string }> }) {
    const { billId } = use(params);
    const router = useRouter();

    const [bill, setBill] = useState<BillWithItems | null>(null);
    const [loading, setLoading] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentComplete, setPaymentComplete] = useState(false);
    const [qrCode, setQrCode] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<number>(0);

    useEffect(() => {
        initializePage();
    }, [billId]);

    const initializePage = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        api.setToken(session.access_token);

        try {
            const billData = await api.getBill(billId);
            setBill(billData);

            if (billData.status === 'paid') {
                setPaymentComplete(true);
                await generateQRCode();
            }
        } catch (error) {
            console.error('Failed to load bill:', error);
            router.push('/scan');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!bill) return;

        setPaymentLoading(true);
        try {
            // Initiate payment
            const paymentResponse = await api.initiatePayment(bill.id);

            // Simulate payment completion (mock)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify payment
            await api.verifyPayment(paymentResponse.payment.id);

            setPaymentComplete(true);
            await generateQRCode();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Payment failed');
        } finally {
            setPaymentLoading(false);
        }
    };

    const generateQRCode = async () => {
        try {
            const { qrData, expiresAt: expires } = await api.generateQR(billId);
            const qrImageUrl = await QRCode.toDataURL(qrData, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            });
            setQrCode(qrImageUrl);
            setExpiresAt(expires);
        } catch (error) {
            console.error('Failed to generate QR:', error);
        }
    };

    const formatTimeRemaining = () => {
        if (!expiresAt) return '';
        const remaining = Math.max(0, expiresAt - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-xl">Loading...</div>
            </div>
        );
    }

    if (!bill) {
        return null;
    }

    return (
        <main className="min-h-screen flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white mr-4"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold">
                    {paymentComplete ? 'Payment Complete' : 'Checkout'}
                </h1>
            </div>

            {!paymentComplete ? (
                <>
                    {/* Order Summary */}
                    <div className="card mb-6">
                        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                        <div className="space-y-3 mb-4">
                            {bill.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-slate-400">
                                        {item.product?.name} x{item.quantity}
                                    </span>
                                    <span>₹{item.total_price.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-slate-700 pt-4">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Subtotal</span>
                                <span>₹{bill.total_amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-slate-400">Tax (0%)</span>
                                <span>₹0.00</span>
                            </div>
                            <div className="flex justify-between mt-4 text-xl font-bold">
                                <span>Total</span>
                                <span className="text-blue-400">₹{bill.total_amount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="card mb-6">
                        <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                        <div className="space-y-3">
                            <label className="flex items-center gap-4 p-4 rounded-xl bg-slate-800 cursor-pointer border-2 border-blue-500">
                                <input type="radio" name="payment" className="hidden" defaultChecked />
                                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <span className="text-xl">📱</span>
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">UPI</div>
                                    <div className="text-sm text-slate-400">Pay using any UPI app</div>
                                </div>
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Pay Button */}
                    <button
                        onClick={handlePayment}
                        disabled={paymentLoading}
                        className="btn btn-primary w-full py-4 text-lg mt-auto disabled:opacity-50"
                    >
                        {paymentLoading ? (
                            <div className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </div>
                        ) : (
                            `Pay ₹${bill.total_amount.toFixed(2)}`
                        )}
                    </button>
                </>
            ) : (
                /* QR Code Display */
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                        <p className="text-slate-400">Show this QR code at the exit gate</p>
                    </div>

                    {qrCode && (
                        <div className="bg-white p-4 rounded-2xl mb-6">
                            <img src={qrCode} alt="Exit QR Code" className="w-64 h-64" />
                        </div>
                    )}

                    <div className="card w-full max-w-sm">
                        <div className="flex justify-between mb-2">
                            <span className="text-slate-400">Bill Number</span>
                            <span className="font-mono">{bill.bill_number}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-slate-400">Items</span>
                            <span>{bill.total_items}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-slate-400">Amount Paid</span>
                            <span className="text-green-400 font-semibold">₹{bill.total_amount.toFixed(2)}</span>
                        </div>
                        {expiresAt > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-400">Valid for</span>
                                <span className="text-yellow-400">{formatTimeRemaining()}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => router.push('/scan')}
                        className="btn btn-secondary w-full max-w-sm mt-6 py-4"
                    >
                        Start New Shopping
                    </button>
                </div>
            )}
        </main>
    );
}
