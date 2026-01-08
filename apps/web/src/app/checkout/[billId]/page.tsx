'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Bill, type BillItem } from '@/lib/api';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase-client';

export default function CheckoutPage({ params }: { params: Promise<{ billId: string }> }) {
    // Correctly unwrap params using React.use()
    const { billId } = use(params);
    const router = useRouter();

    const [bill, setBill] = useState<Bill | null>(null);
    const [qrCode, setQrCode] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState<number>(30 * 60);
    const [status, setStatus] = useState<string>('pending');
    const [items, setItems] = useState<BillItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            await initSession();
            await loadBill();
        };
        init();

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        const poller = setInterval(checkStatus, 3000);

        return () => {
            clearInterval(timer);
            clearInterval(poller);
        };
    }, [billId]);

    const initSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        api.setToken(session.access_token);
    }

    const loadBill = async () => {
        try {
            const billData = await api.getBill(billId);
            setBill(billData);
            setStatus(billData.status);
            if (billData.items) setItems(billData.items);

            // Generate QR logic - fetching from API or generating locally if API sends data
            // Assuming API returns string to encode or we encode the bill ID signed
            const qrData = await api.getQR(billId);
            if (qrData && qrData.qrCode) {
                const url = await QRCode.toDataURL(qrData.qrCode);
                setQrCode(url);

                // Calculate remaining time
                const expires = new Date(qrData.expiresAt).getTime();
                const now = new Date().getTime();
                setTimeLeft(Math.max(0, Math.floor((expires - now) / 1000)));
            }
        } catch (error) {
            console.error('Failed to load bill', error);
        } finally {
            setLoading(false);
        }
    };

    const checkStatus = async () => {
        try {
            const b = await api.getBill(billId);
            if (b.status === 'paid' || b.status === 'verified') {
                setStatus(b.status);
                router.push('/history'); // Redirect or show success
            }
        } catch (e) {
            // ignore
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handlePayment = async () => {
        try {
            const res = await api.initiatePayment(billId);
            // Handle Razorpay mock
            await api.verifyPayment(res.payment.id); // Auto-verify for mock
            checkStatus();
        } catch (e) {
            alert('Payment execution failed');
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;
    if (!bill) return <div className="p-8 text-center text-white">Bill not found</div>;

    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 pb-24">
            <h1 className="text-xl font-bold mb-4 text-center">Checkout</h1>

            {/* QR Code Section */}
            <div className="card flex flex-col items-center justify-center p-6 mb-4">
                {status === 'pending' ? (
                    <>
                        <div className="text-sm text-slate-400 mb-2">Scan to Pay / Verify</div>
                        {qrCode ? (
                            <img src={qrCode} alt="QR Code" className="w-64 h-64 rounded-xl border-4 border-white" />
                        ) : (
                            <div className="w-64 h-64 bg-slate-800 animate-pulse rounded-xl" />
                        )}
                        <div className="mt-4 text-2xl font-mono font-bold text-blue-400">
                            {formatTime(timeLeft)}
                        </div>
                        <div className="text-xs text-slate-500">Expires in</div>
                    </>
                ) : (
                    <div className="text-green-500 font-bold text-xl">
                        {status.toUpperCase()}
                    </div>
                )}
            </div>

            {/* Payment Button (for manual/mock flow) */}
            {status === 'pending' && (
                <button
                    onClick={handlePayment}
                    className="w-full btn btn-primary py-3 mb-6"
                >
                    Pay Now (Mock)
                </button>
            )}

            {/* Items List */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg">Items ({bill.total_items})</h3>
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id || item.product_id} className="card flex justify-between">
                            <div>
                                <div className="font-medium text-white">{item.product?.name || 'Item'}</div>
                                <div className="text-sm text-slate-400">Qty: {item.quantity} × ₹{item.price_at_time}</div>
                            </div>
                            <div className="font-bold">₹{item.price_at_time * item.quantity}</div>
                        </div>
                    ))}
                </div>
                <div className="card bg-slate-800 p-4 flex justify-between items-center text-lg font-bold border-t border-slate-700">
                    <span>Total Amount</span>
                    <span className="text-green-400">₹{bill.total_amount}</span>
                </div>
            </div>
        </main>
    );
}
