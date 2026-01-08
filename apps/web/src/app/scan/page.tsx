'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
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

    // Hackathon Features
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [manualBarcodeInput, setManualBarcodeInput] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

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
        await Promise.all([
            createOrLoadBill(),
            loadProducts()
        ]);
        setLoading(false);
    };

    const loadProducts = async () => {
        try {
            const allProducts = await api.getProducts(DEFAULT_STORE_ID);
            setProducts(allProducts);
            setFilteredProducts(allProducts);
        } catch (e) {
            console.error('Failed to load products', e);
        }
    };

    const createOrLoadBill = async () => {
        try {
            const bills = await api.getMyBills('pending');
            if (bills.length > 0) {
                const fullBill = await api.getBill(bills[0].id);
                setBill(fullBill);
                updateThresholdStatus(fullBill);
            } else {
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
        setShowManualEntry(false);
        try {
            codeReaderRef.current = new BrowserMultiFormatReader();
            const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();

            if (videoInputDevices.length === 0) {
                alert('No camera found. Using manual entry.');
                setScanning(false);
                setShowManualEntry(true);
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
            setShowManualEntry(true);
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
        setShowManualEntry(false);
        setManualBarcodeInput('');

        try {
            const product = await api.getProductByBarcode(barcode, DEFAULT_STORE_ID);
            setLastScannedProduct(product);
            setQuantity(1);
            setShowProductModal(true);
        } catch {
            alert('Product not found for barcode: ' + barcode);
        }
    };

    const addProductToCart = async () => {
        if (!bill || !lastScannedProduct) return;

        try {
            await api.addItem(bill.id, lastScannedProduct.id, quantity);
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

    // Manual Entry Logic
    const handleManualSearch = (term: string) => {
        setManualBarcodeInput(term);
        if (!term) {
            setFilteredProducts(products);
            return;
        }
        const lower = term.toLowerCase();
        setFilteredProducts(products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.barcode.includes(lower)
        ));
    };

    const handleManualSelect = (product: Product) => {
        handleBarcodeScanned(product.barcode);
    };

    // Auto-complete submission
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const product = products.find(p => p.barcode === manualBarcodeInput) ||
            products.find(p => p.name.toLowerCase() === manualBarcodeInput.toLowerCase());

        if (product) {
            handleBarcodeScanned(product.barcode);
        } else if (manualBarcodeInput.length > 3) {
            // Try as direct barcode
            handleBarcodeScanned(manualBarcodeInput);
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
        <main className="min-h-screen flex flex-col pb-40 relative bg-slate-900">
            {/* Header */}
            <header className="glass sticky top-0 z-40 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">ScanKart</h1>
                        <p className="text-sm text-slate-400">Bill #{bill?.bill_number}</p>
                    </div>
                    <button
                        onClick={() => router.push('/history')}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                    >
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>

                {/* Threshold Indicator */}
                {thresholdStatus && (
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Limit Status</span>
                            <span className={thresholdStatus.priceExceeded ? 'text-red-400' : 'text-slate-300'}>
                                {thresholdStatus.pricePercentage}% Used
                            </span>
                        </div>
                        <div className="threshold-bar">
                            <div
                                className={`threshold-fill ${thresholdStatus.warningLevel}`}
                                style={{ width: `${thresholdStatus.pricePercentage}%` }}
                            />
                        </div>

                        {thresholdStatus.warningLevel === 'blocked' && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                                <span className="text-lg">🛑</span>
                                Scan-and-Pay disabled. Limit reached.
                            </div>
                        )}
                        {thresholdStatus.warningLevel === 'critical' && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                                <span className="text-lg">⚠️</span>
                                Approaching limit.
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Cart Items */}
            <div className="flex-1 p-4 overflow-y-auto">
                {bill?.items && bill.items.length > 0 ? (
                    <div className="space-y-3">
                        {bill.items.map((item) => (
                            <div key={item.id} className="card flex items-center gap-4 animate-fadeIn">
                                <div className="w-14 h-14 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                    {item.product?.image_url ? (
                                        <img src={item.product.image_url} alt="" className="w-full h-full object-cover rounded-lg opacity-80" />
                                    ) : (
                                        <span className="text-xl">📦</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate text-slate-200">{item.product?.name}</div>
                                    <div className="text-xs text-slate-400">₹{item.unit_price} / unit</div>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-1">
                                    <button
                                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                        className="w-8 h-8 rounded-md hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                                    >
                                        −
                                    </button>
                                    <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                                    <button
                                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                        className="w-8 h-8 rounded-md hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                        <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                            <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-slate-300">Your cart is empty</p>
                        <p className="text-sm text-slate-500 mt-1">Scan items to get started</p>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="fixed bottom-0 left-0 right-0 glass border-t border-slate-700/50 p-4 z-40">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</div>
                        <div className="text-2xl font-bold text-white">₹{bill?.total_amount.toFixed(2) || '0.00'}</div>
                    </div>
                    <button
                        onClick={proceedToCheckout}
                        disabled={!bill?.items?.length || !thresholdStatus?.canUseScanAndPay}
                        className="btn btn-primary px-8 py-3 rounded-xl disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-blue-500/20"
                    >
                        Checkout
                        <svg className="w-4 h-4 ml-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={startScanning}
                        className="btn flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Scan
                    </button>
                    <button
                        onClick={() => setShowManualEntry(!showManualEntry)}
                        className="btn bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 px-4 rounded-xl border border-slate-700 transition-colors"
                    >
                        ⌨️
                    </button>
                </div>
            </div>

            {/* Manual Entry Sheet (Hackathon Mode) */}
            {showManualEntry && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-md bg-slate-900 rounded-t-3xl sm:rounded-2xl p-6 h-[80vh] flex flex-col shadow-2xl border border-slate-700">
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 shrink-0" />

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                ⌨️ Manual Entry <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded border border-blue-500/30">Hackathon Mode</span>
                            </h2>
                            <button onClick={() => setShowManualEntry(false)} className="p-2 text-slate-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={manualBarcodeInput}
                                    onChange={(e) => handleManualSearch(e.target.value)}
                                    placeholder="Search product or enter barcode..."
                                    className="input bg-slate-800 border-slate-700 text-white w-full h-12 pl-10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500"
                                    autoFocus
                                />
                                <svg className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </form>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => handleManualSelect(product)}
                                    className="w-full bg-slate-800/50 hover:bg-slate-800 p-3 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition-all flex items-center gap-3 text-left group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-lg shrink-0 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                                        📦
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-200 truncate">{product.name}</div>
                                        <div className="text-xs text-slate-500 font-mono">{product.barcode}</div>
                                    </div>
                                    <div className="text-blue-400 font-bold">₹{product.price}</div>
                                </button>
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="text-center text-slate-500 py-8">No products found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Scanner Overlay */}
            {scanning && (
                <div className="scanner-overlay z-50">
                    <button
                        onClick={stopScanning}
                        className="absolute top-4 right-4 p-3 rounded-full bg-black/40 text-white border border-white/10 hover:bg-black/60 backdrop-blur-md transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="scanner-frame">
                        <video ref={videoRef} className="w-full h-full object-cover rounded-2xl" />
                        <div className="scan-line" />
                        <div className="absolute inset-0 border-2 border-blue-500/50 rounded-2xl"></div>
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 -ml-1 -mt-1 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 -mr-1 -mt-1 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 -ml-1 -mb-1 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 -mr-1 -mb-1 rounded-br-xl"></div>
                    </div>

                    <p className="text-white/80 mt-6 font-medium text-lg bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/10">
                        Align QR / Barcode within frame
                    </p>
                </div>
            )}

            {/* Product Modal */}
            {showProductModal && lastScannedProduct && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                        <div className="flex gap-5 mb-8">
                            <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center shadow-lg shrink-0">
                                {lastScannedProduct.image_url ? (
                                    <img src={lastScannedProduct.image_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <span className="text-4xl">🛍️</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-white leading-tight mb-1">{lastScannedProduct.name}</h2>
                                <p className="text-slate-400 text-sm mb-2">{lastScannedProduct.category}</p>
                                <div className="bg-blue-500/10 text-blue-400 inline-block px-3 py-1 rounded-lg font-bold border border-blue-500/20">
                                    ₹{lastScannedProduct.price}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 mb-8 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-2xl text-white transition-colors border border-slate-700"
                            >
                                −
                            </button>
                            <div className="text-center">
                                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Quantity</div>
                                <span className="text-4xl font-bold text-white tracking-tight">{quantity}</span>
                            </div>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-2xl text-white transition-colors border border-slate-700"
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
                                className="btn btn-secondary flex-1 py-4 rounded-xl border-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addProductToCart}
                                className="btn btn-primary flex-1 py-4 rounded-xl shadow-lg shadow-blue-500/20"
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
