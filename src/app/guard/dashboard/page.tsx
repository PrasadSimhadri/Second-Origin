'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { api } from '@/lib/api';
import VoiceButton from '@/components/VoiceButton';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BillItem {
    productId: string;
    name: string;
    quantity: number;
    price: number;
}

interface VerificationResult {
    valid: boolean;
    message: string;
    bill?: {
        id: string;
        bill_number: string;
        total_amount: number;
        total_items: number;
        items?: BillItem[];
    };
    payload?: {
        items?: BillItem[];
    };
}

export default function GuardDashboardPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    const [scanning, setScanning] = useState(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [todayStats, setTodayStats] = useState({ verified: 0, flagged: 0 });

    useEffect(() => {
        initSession();
        return () => stopScanning();
    }, []);

    const initSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/guard/login');
            return;
        }
        api.setToken(session.access_token);
    };

    const startScanning = async () => {
        setScanning(true);
        setVerificationResult(null);
        try {
            codeReaderRef.current = new BrowserMultiFormatReader();
            const devices = await codeReaderRef.current.listVideoInputDevices();
            if (devices.length === 0) {
                alert('No camera found');
                setScanning(false);
                return;
            }
            const deviceId = devices.find(d =>
                d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
            )?.deviceId || devices[0].deviceId;

            await codeReaderRef.current.decodeFromVideoDevice(
                deviceId,
                videoRef.current!,
                async (result) => {
                    if (result) {
                        await handleQRScanned(result.getText());
                    }
                }
            );
        } catch (error) {
            console.error('Scanner error:', error);
            setScanning(false);
        }
    };

    const stopScanning = () => {
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
            codeReaderRef.current = null;
        }
        setScanning(false);
    };

    const handleQRScanned = async (qrData: string) => {
        stopScanning();
        setIsProcessing(true);

        try {
            const result = await api.validateQR(qrData);
            if (result.valid && result.bill) {
                await api.verifyBill(result.bill.id);
                const payload = result.payload as { items?: BillItem[] } | undefined;
                setVerificationResult({
                    valid: true,
                    message: 'Payment Verified ✓',
                    bill: {
                        id: result.bill.id,
                        bill_number: result.bill.bill_number,
                        total_amount: result.bill.total_amount,
                        total_items: result.bill.total_items,
                    },
                    payload,
                });
                setTodayStats(prev => ({ ...prev, verified: prev.verified + 1 }));
            } else {
                setVerificationResult({
                    valid: false,
                    message: result.error || 'Invalid QR Code',
                });
            }
        } catch (error) {
            setVerificationResult({
                valid: false,
                message: error instanceof Error ? error.message : 'Verification failed',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVoiceCommand = async (text: string) => {
        setIsProcessing(true);
        try {
            const response = await api.processVoiceCommand(text);
            if (response.action === 'start_scan') {
                startScanning();
            }
        } catch (error) {
            console.error('Voice command failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="glass p-4 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                            Guard Portal
                        </h1>
                        <p className="text-sm text-slate-400">Exit Verification</p>
                    </div>
                    <div className="flex gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-green-400">{todayStats.verified}</div>
                            <div className="text-xs text-slate-500">Verified</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-400">{todayStats.flagged}</div>
                            <div className="text-xs text-slate-500">Flagged</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
                {!scanning && !verificationResult && (
                    <div className="text-center">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-6 border-2 border-green-500/30">
                            <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Ready to Scan</h2>
                        <p className="text-slate-400 mb-8">Tap the button below to scan customer&apos;s QR code</p>
                        <button
                            onClick={startScanning}
                            className="btn bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all"
                        >
                            Start Scanning
                        </button>
                    </div>
                )}

                {scanning && (
                    <div className="scanner-overlay">
                        <button
                            onClick={stopScanning}
                            className="absolute top-4 right-4 p-3 rounded-full bg-black/40 text-white"
                        >
                            ✕
                        </button>
                        <div className="scanner-frame">
                            <video ref={videoRef} className="w-full h-full object-cover rounded-2xl" />
                            <div className="scan-line" />
                        </div>
                        <p className="text-white/80 mt-6 font-medium">Scan Customer QR Code</p>
                    </div>
                )}

                {verificationResult && (
                    <div className={`card max-w-sm w-full text-center ${verificationResult.valid ? 'border-green-500/50' : 'border-red-500/50'}`}>
                        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${verificationResult.valid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {verificationResult.valid ? (
                                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </div>
                        <h2 className={`text-2xl font-bold mb-2 ${verificationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                            {verificationResult.message}
                        </h2>
                        {verificationResult.bill && (
                            <div className="mt-4 text-slate-400">
                                <p className="mb-2">Bill #{verificationResult.bill.bill_number}</p>
                                <p className="text-xl font-bold text-white mb-4">₹{verificationResult.bill.total_amount.toFixed(2)}</p>

                                {/* Items List */}
                                {verificationResult.payload?.items && verificationResult.payload.items.length > 0 && (
                                    <div className="text-left mt-4 border-t border-slate-700 pt-4">
                                        <p className="text-sm font-semibold text-slate-300 mb-2">Items ({verificationResult.bill.total_items}):</p>
                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                            {verificationResult.payload.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => setVerificationResult(null)}
                            className="btn btn-secondary mt-6 w-full py-3"
                        >
                            Scan Next
                        </button>
                    </div>
                )}
            </div>

            {/* Voice Button */}
            <div className="fixed bottom-6 right-6">
                <VoiceButton onCommand={handleVoiceCommand} isProcessing={isProcessing} />
            </div>
        </main>
    );
}
