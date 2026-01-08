'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { api, type Product } from '@/lib/api';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function ScanPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    const [scanning, setScanning] = useState(false);
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [loading, setLoading] = useState(false);

    // Limits
    const [limits, setLimits] = useState({ max_price: 5000, max_quantity: 20 });
    const limitStatus = {
        price: cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0) / limits.max_price,
        quantity: cart.reduce((acc, item) => acc + item.quantity, 0) / limits.max_quantity
    };

    // Manual Entry
    const [manualOpen, setManualOpen] = useState(false);
    const [manualQuery, setManualQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        initSession();
        fetchLimits();
        return () => stopScanning();
    }, []);

    const initSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        api.setToken(session.access_token);
    };

    const fetchLimits = async () => {
        try {
            const l = await api.getStoreThresholds();
            setLimits(l);
        } catch (e) {
            console.error(e);
        }
    };

    // Logout
    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            await supabase.auth.signOut();
            router.push('/login');
        }
    };

    // Scanning
    const startScanning = async () => {
        setScanning(true);
        try {
            codeReaderRef.current = new BrowserMultiFormatReader();
            const devices = await codeReaderRef.current.listVideoInputDevices();
            const deviceId = devices.find(d =>
                d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
            )?.deviceId || devices[0].deviceId;

            await codeReaderRef.current.decodeFromVideoDevice(
                deviceId,
                videoRef.current!,
                async (result) => {
                    if (result) {
                        await addToCart(result.getText());
                        stopScanning();
                    }
                }
            );
        } catch (error) {
            console.error('Scanner error:', error);
            setScanning(false);
            alert('Camera error');
        }
    };

    const stopScanning = () => {
        codeReaderRef.current?.reset();
        setScanning(false);
    };

    // Cart Logic
    const addToCart = async (barcode: string) => {
        // Optimization: Check if item is already in cart to avoid API call
        const existingItem = cart.find(item => item.product.barcode === barcode);
        if (existingItem) {
            incrementQty(existingItem.product.id);
            return;
        }

        setLoading(true);
        try {
            const product = await api.getProductByBarcode(barcode);
            if (!product) {
                alert('Product not found');
                return;
            }
            addToCartDirect(product);
        } catch (error) {
            alert('Failed to add product');
        } finally {
            setLoading(false);
        }
    };

    const addToCartDirect = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(p => p.product.id === product.id);
            if (existing) {
                return prev.map(p => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { product, quantity: 1 }];
        });
        setManualOpen(false);
        setManualQuery('');
        setSearchResults([]);
    };

    const incrementQty = (productId: string) => {
        setCart(prev => prev.map(p => p.product.id === productId ? { ...p, quantity: p.quantity + 1 } : p));
    };

    const decrementQty = (productId: string) => {
        setCart(prev => prev.map(p => {
            if (p.product.id === productId) {
                return { ...p, quantity: Math.max(0, p.quantity - 1) };
            }
            return p;
        }).filter(p => p.quantity > 0));
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(p => p.product.id !== productId));
    };

    // Manual Search
    const search = async () => {
        if (!manualQuery.trim()) return;
        setSearching(true);
        try {
            const results = await api.searchProducts(manualQuery);
            setSearchResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    // Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const items = cart.map(i => ({ productId: i.product.id, quantity: i.quantity }));
            const bill = await api.createBill(items);
            router.push(`/checkout/${bill.id}`);
        } catch (error) {
            alert('Checkout failed');
        } finally {
            setLoading(false);
        }
    };

    const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

    return (
        <main className="min-h-screen bg-slate-900 pb-24 text-white">
            <header className="p-4 flex justify-between items-center glass sticky top-0 z-40">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">ScanKart</h1>
                <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white">
                    Logout
                </button>
            </header>

            {/* Limit Status Bar */}
            <div className={`p-2 text-xs text-center font-medium ${limitStatus.price > 1 || limitStatus.quantity > 1 ? 'bg-red-500' : 'bg-slate-800'}`}>
                Trust Spending Limit: {Math.min(limitStatus.price * 100, 100).toFixed(0)}% used
                {limitStatus.quantity > 1 && ' (Qty Limit Reached)'}
            </div>

            <div className="p-4 space-y-4">
                {/* Cart */}
                {cart.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        Scan items to start shopping
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((item) => (
                            <div key={item.product.id} className="card flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-white">{item.product.name}</div>
                                    <div className="text-sm text-slate-400">₹{item.product.price} / unit</div>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-1">
                                    <button onClick={() => decrementQty(item.product.id)} className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded hover:bg-slate-600 text-lg font-bold">-</button>
                                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                                    <button onClick={() => incrementQty(item.product.id)} className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded hover:bg-blue-500 text-lg font-bold">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="fixed bottom-0 left-0 w-full p-4 glass space-y-3">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <div className="text-xs text-slate-400">Total</div>
                        <div className="text-2xl font-bold text-white">₹{total.toFixed(2)}</div>
                    </div>
                    {cart.length > 0 && (
                        <button
                            onClick={handleCheckout}
                            disabled={loading || limitStatus.price > 1 || limitStatus.quantity > 1}
                            className="btn btn-primary px-8 py-3 rounded-xl disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Checkout'}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setManualOpen(true)}
                        className="btn bg-slate-700 text-white rounded-xl py-3"
                    >
                        Type Name
                    </button>
                    <button
                        onClick={startScanning}
                        className="btn bg-blue-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-500/30"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Scan Product
                    </button>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {manualOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end">
                    <div className="bg-slate-900 rounded-t-3xl p-6 h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Search Product</h2>
                            <button onClick={() => setManualOpen(false)} className="text-slate-400">Close</button>
                        </div>

                        <div className="flex gap-2 mb-6">
                            <input
                                value={manualQuery}
                                onChange={(e) => setManualQuery(e.target.value)}
                                placeholder="Search by name (e.g. Milk)"
                                className="input flex-1"
                                autoFocus
                            />
                            <button onClick={search} className="btn btn-primary" disabled={searching}>Search</button>
                        </div>

                        <div className="space-y-3">
                            {searchResults.map(p => (
                                <div key={p.id} className="card flex justify-between items-center" onClick={() => addToCartDirect(p)}>
                                    <div>
                                        <div className="font-medium text-white">{p.name}</div>
                                        <div className="text-sm text-slate-400">₹{p.price}</div>
                                    </div>
                                    <button className="btn btn-secondary text-xs">Add +</button>
                                </div>
                            ))}
                            {searchResults.length === 0 && !searching && manualQuery && <div className="text-slate-500 text-center">No results</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Scanner Overlay */}
            {scanning && (
                <div className="scanner-overlay">
                    <button onClick={stopScanning} className="absolute top-4 right-4 p-4 text-white text-xl">✕</button>
                    <div className="scanner-frame">
                        <video ref={videoRef} className="w-full h-full object-cover" />
                        <div className="scan-line" />
                    </div>
                    <p className="text-white mt-8">Point camera at barcode</p>
                </div>
            )}
        </main>
    );
}
