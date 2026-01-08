'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api, type Product, type BillWithItems, type ThresholdStatus } from '@/lib/api';
import { BrowserMultiFormatReader } from '@zxing/library';

const DEFAULT_STORE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

export default function ScanPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [bill, setBill] = useState<BillWithItems | null>(null);
    const [thresholdStatus, setThresholdStatus] = useState<ThresholdStatus | null>(null);
    const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        initializeSession();
        return () => {
            stopScanning();
        };
    }, []);

    const initializeSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        api.setToken(session.access_token);
        await createOrLoadBill();
        setLoading(false);
    };

    const createOrLoadBill = async () => {
        try {
            // Try to get existing pending bill
            const bills = await api.getMyBills('pending');
            if (bills.length > 0) {
                const fullBill = await api.getBill(bills[0].id);
                setBill(fullBill);
                updateThresholdStatus(fullBill);
            } else {
                // Create new bill
                const newBill = await api.createBill(DEFAULT_STORE_ID);
                const fullBill = await api.getBill(newBill.id);
                setBill(fullBill);
            }
        } catch (error) {
            console.error('Failed to load bill:', error);
        }
    };

    const updateThresholdStatus = (billData: BillWithItems) => {
        const store = billData.store;
        const priceThreshold = store?.price_threshold || 5000;
        const quantityThreshold = store?.quantity_threshold || 20;

        const pricePercentage = (billData.total_amount / priceThreshold) * 100;
        const quantityPercentage = (billData.total_items / quantityThreshold) * 100;

        const priceExceeded = billData.total_amount > priceThreshold;
        const quantityExceeded = billData.total_items > quantityThreshold;

        let warningLevel: ThresholdStatus['warningLevel'] = 'none';
        if (priceExceeded || quantityExceeded) {
            warningLevel = 'blocked';
        } else if (pricePercentage >= 90 || quantityPercentage >= 90) {
            warningLevel = 'critical';
        } else if (pricePercentage >= 70 || quantityPercentage >= 70) {
            warningLevel = 'warning';
        }

        setThresholdStatus({
            canUseScanAndPay: !priceExceeded && !quantityExceeded,
            priceExceeded,
            quantityExceeded,
            pricePercentage: Math.min(100, Math.round(pricePercentage)),
            quantityPercentage: Math.min(100, Math.round(quantityPercentage)),
            warningLevel,
        });
    };

    const startScanning = async () => {
        setScanning(true);
        try {
            codeReaderRef.current = new BrowserMultiFormatReader();
            const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();

            if (videoInputDevices.length === 0) {
                alert('No camera found');
                setScanning(false);
                return;
            }

            const selectedDeviceId = videoInputDevices.find(d =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear')
            )?.deviceId || videoInputDevices[0].deviceId;

            await codeReaderRef.current.decodeFromVideoDevice(
                selectedDeviceId,
                videoRef.current!,
                async (result) => {
                    if (result) {
                        await handleBarcodeScanned(result.getText());
                    }
                }
            );
        } catch (error) {
            console.error('Scanner error:', error);
            setScanning(false);
        }
    };

    const stopScanning = useCallback(() => {
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
            codeReaderRef.current = null;
        }
        setScanning(false);
    }, []);

    const handleBarcodeScanned = async (barcode: string) => {
        stopScanning();

        try {
            const product = await api.getProductByBarcode(barcode, DEFAULT_STORE_ID);
            setLastScannedProduct(product);
            setQuantity(1);
            setShowProductModal(true);
        } catch {
            alert('Product not found');
        }
    };

    const addProductToCart = async () => {
        if (!bill || !lastScannedProduct) return;

        try {
            const result = await api.addItem(bill.id, lastScannedProduct.id, quantity);
            const updatedBill = await api.getBill(bill.id);
            setBill(updatedBill);
            updateThresholdStatus(updatedBill);
            setShowProductModal(false);
            setLastScannedProduct(null);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to add item');
        }
    };

    const updateItemQuantity = async (itemId: string, newQuantity: number) => {
        if (!bill) return;

        try {
            if (newQuantity === 0) {
                await api.removeItem(bill.id, itemId);
            } else {
                await api.updateItem(bill.id, itemId, newQuantity);
            }
            const updatedBill = await api.getBill(bill.id);
            setBill(updatedBill);
            updateThresholdStatus(updatedBill);
        } catch (error) {
            console.error('Failed to update item:', error);
        }
    };

    const proceedToCheckout = () => {
        if (bill) {
            router.push(`/checkout/${bill.id}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <main className="min-h-screen flex flex-col pb-32">
            {/* Header */}
            <header className="glass sticky top-0 z-40 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">ScanKart</h1>
                        <p className="text-sm text-slate-400">Bill #{bill?.bill_number}</p>
                    </div>
                    <button
                        onClick={() => router.push('/history')}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>

                {/* Threshold Indicator */}
                {thresholdStatus && (
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Price Limit</span>
                            <span className={thresholdStatus.priceExceeded ? 'text-red-400' : 'text-slate-300'}>
                                ₹{bill?.total_amount.toFixed(2)} / ₹{bill?.store?.price_threshold || 5000}
                            </span>
                        </div>
                        <div className="threshold-bar">
                            <div
                                className={`threshold-fill ${thresholdStatus.warningLevel}`}
                                style={{ width: `${thresholdStatus.pricePercentage}%` }}
                            />
                        </div>

                        {thresholdStatus.warningLevel === 'blocked' && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
                                ⚠️ Scan-and-Pay disabled. Please use regular billing counter.
                            </div>
                        )}
                        {thresholdStatus.warningLevel === 'critical' && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg text-sm">
                                ⚡ Approaching limit. Add items carefully.
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Cart Items */}
            <div className="flex-1 p-4">
                {bill?.items && bill.items.length > 0 ? (
                    <div className="space-y-3">
                        {bill.items.map((item) => (
                            <div key={item.id} className="card flex items-center gap-4">
                                <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">{item.product?.name}</div>
                                    <div className="text-sm text-slate-400">₹{item.unit_price}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                        className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center hover:bg-slate-600"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                        className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center hover:bg-slate-600"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="font-semibold">₹{item.total_price.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <p className="text-slate-400">Your cart is empty</p>
                        <p className="text-sm text-slate-500">Tap the scan button to add items</p>
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 glass p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400">{bill?.total_items || 0} items</div>
                        <div className="text-2xl font-bold">₹{bill?.total_amount.toFixed(2) || '0.00'}</div>
                    </div>
                    <button
                        onClick={proceedToCheckout}
                        disabled={!bill?.items?.length || !thresholdStatus?.canUseScanAndPay}
                        className="btn btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Checkout
                    </button>
                </div>

                {/* Scan Button */}
                <button
                    onClick={startScanning}
                    className="w-full btn btn-secondary py-4 flex items-center justify-center gap-2"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Scan Barcode
                </button>
            </div>

            {/* Scanner Overlay */}
            {scanning && (
                <div className="scanner-overlay">
                    <button
                        onClick={stopScanning}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="scanner-frame">
                        <video ref={videoRef} className="w-full h-full object-cover rounded-lg" />
                        <div className="scan-line" />
                    </div>

                    <p className="text-slate-400 mt-4">Point camera at barcode</p>
                </div>
            )}

            {/* Product Modal */}
            {showProductModal && lastScannedProduct && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
                    <div className="w-full bg-slate-900 rounded-t-3xl p-6">
                        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />

                        <div className="flex gap-4 mb-6">
                            <div className="w-20 h-20 rounded-xl bg-slate-800 flex items-center justify-center">
                                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold">{lastScannedProduct.name}</h2>
                                <p className="text-slate-400">{lastScannedProduct.category}</p>
                                <p className="text-2xl font-bold text-blue-400 mt-1">₹{lastScannedProduct.price}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 mb-6">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl hover:bg-slate-700"
                            >
                                -
                            </button>
                            <span className="text-3xl font-bold w-16 text-center">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl hover:bg-slate-700"
                            >
                                +
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowProductModal(false);
                                    setLastScannedProduct(null);
                                }}
                                className="btn btn-secondary flex-1 py-4"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addProductToCart}
                                className="btn btn-primary flex-1 py-4"
                            >
                                Add ₹{(lastScannedProduct.price * quantity).toFixed(2)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
