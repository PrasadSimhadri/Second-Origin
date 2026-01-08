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

            // Generate QR logic
            const qrData = await api.getQR(billId);
            if (qrData && qrData.qrCode) {
                const url = await QRCode.toDataURL(qrData.qrCode);
                setQrCode(url);

                // Calculate remaining time
                const expires = new Date(qrData.expiresAt).getTime();
                const now = new Date().getTime();
                // If expires is in future, set timeLeft. Else 0.
                const secondsLeft = Math.max(0, Math.floor((expires - now) / 1000));

                // Only update if difference is significant to avoid jitter, or just set it
                setTimeLeft(secondsLeft);
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
                router.push('/history');
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
            await api.verifyPayment(res.payment.id); // Auto-verify for mock
            checkStatus();
        } catch (e) {
            alert('Payment execution failed');
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;
    if (!bill) return <div className="p-8 text-center text-white">Bill not found</div>;

    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 pb-24 flex flex-col items-center">
            <h1 className="text-xl font-bold mb-6 text-center w-full">Checkout</h1>

            <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8 items-start">

                {/* Left Column: QR Code & Status */}
                <div className="w-full md:w-1/2 flex flex-col gap-6">
                    <div className="card flex flex-col items-center justify-center p-8 bg-slate-800/80 border-slate-700">
                        {status === 'pending' ? (
                            <>
                                <div className="text-sm text-slate-400 mb-4 font-medium uppercase tracking-wider">Scan to Pay / Exit</div>
                                {qrCode ? (
                                    <div className="relative">
                                        <img src={qrCode} alt="QR Code" className="w-72 h-72 rounded-xl border-8 border-white shadow-2xl" />
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 px-3 py-1 rounded-full text-xs font-mono border border-slate-700">
                                            #{bill?.bill_number}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-72 h-72 bg-slate-700 animate-pulse rounded-xl" />
                                )}

                                <div className="mt-8 text-center">
                                    <div className={`text-4xl font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                                        {formatTime(timeLeft)}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Valid For</div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center py-12">
                                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-lg shadow-green-500/20">
                                    ✓
                                </div>
                                <div className="text-green-400 font-bold text-2xl tracking-tight">
                                    PAYMENT {status.toUpperCase()}
                                </div>
                                <div className="text-slate-400 text-sm mt-2">
                                    Bill #{bill?.bill_number}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Button (for manual/mock flow) */}
                    {status === 'pending' && (
                        <button
                            onClick={handlePayment}
                            className="w-full btn btn-primary py-4 text-lg font-bold shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all"
                        >
                            Pay Now (Mock)
                        </button>
                    )}
                </div>

                {/* Right Column: Items List */}
                <div className="w-full md:w-1/2 flex flex-col gap-6">
                    <div className="card bg-slate-800/50 border-slate-700 p-0 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b border-slate-700 bg-slate-800/80 sticky top-0 backdrop-blur-md">
                            <h3 className="font-bold text-lg flex justify-between items-center">
                                <span>Cart Items</span>
                                <span className="text-slate-400 text-sm bg-slate-900 px-2 py-1 rounded-md">{bill?.total_items} items</span>
                            </h3>
                        </div>

                        <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
                            {items.map((item) => (
                                <div key={item.id || item.product_id} className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div>
                                        <div className="font-medium text-white">{item.product?.name || 'Item'}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            Qty: <span className="text-slate-200">{item.quantity}</span> × ₹{item.price_at_time}
                                        </div>
                                    </div>
                                    <div className="font-bold font-mono text-slate-200">
                                        ₹{(item.price_at_time * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-slate-800 border-t border-slate-700 mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-10">
                            <div className="flex justify-between items-center text-xl font-bold">
                                <span className="text-slate-300">Total Amount</span>
                                <span className="text-green-400 text-2xl">₹{bill?.total_amount?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
