'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api, type QRValidationResult, type VoiceResponse } from '@/lib/api';
import { BrowserMultiFormatReader } from '@zxing/library';
import VoiceButton from '@/components/VoiceButton';

export default function GuardDashboard() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);

  // State for current verification
  const [verifyResult, setVerifyResult] = useState<QRValidationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to scan');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceContext, setVoiceContext] = useState<any>(null); // Stateless context

  useEffect(() => {
    checkAuth();
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
    }
    return () => stopScanning();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    api.setToken(session.access_token);
    setLoading(false);
  };

  const startScanning = async () => {
    setScanning(true);
    setVerifyResult(null);
    setStatusMessage('Scanning...');

    try {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

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
            stopScanning();
            await handleQRScanned(result.getText());
          }
        }
      );
    } catch (error) {
      console.error('Scanner error', error);
      setScanning(false);
      setStatusMessage('Scanner error');
    }
  };

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setScanning(false);
  }, []);

  const handleQRScanned = async (qrData: string) => {
    setStatusMessage('Verifying...');
    setProcessing(true);

    try {
      const result = await api.validateQR(qrData);
      setVerifyResult(result);

      if (result.valid && result.payload) {
        setStatusMessage('Verified');
        // Announce validity
        playVoiceResponse(`Bill verified. Amount ${result.payload.totalAmount} rupees.`);
      } else {
        setStatusMessage(result.error || 'Invalid QR');
        playVoiceResponse(`Invalid QR code. ${result.error || ''}`);
      }
    } catch (error) {
      setStatusMessage('Verification failed');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const verifyBill = async () => {
    if (!verifyResult?.bill?.id) return;

    setProcessing(true);
    try {
      await api.verifyBill(verifyResult.bill.id);
      setStatusMessage('Bill Approved');
      setVerifyResult(null);
      playVoiceResponse('Bill approved. Customer can exit.');
    } catch (error) {
      alert('Failed to approve bill');
    } finally {
      setProcessing(false);
    }
  };

  const handleVoiceCommand = async (text: string) => {
    setVoiceTranscript(text);
    setProcessing(true);

    try {
      const billId = verifyResult?.bill?.id || verifyResult?.payload?.billId;
      const response = await api.processVoiceCommand(text, billId, voiceContext);

      if (response.context) {
        setVoiceContext(response.context);
      }

      if (response.text) {
        setStatusMessage(response.text);
      }

      if (response.audioUrl) {
        await playAudio(response.audioUrl);
      }

      // Handle actions
      if (response.action === 'request_scan') {
        startScanning();
      } else if (response.action === 'flag_created') {
        setVerifyResult(null); // Clear result after flagging
        // Optionally show success or ask for evidence
        if (response.data?.flag) {
          setStatusMessage('Flag created. Add evidence?');
        }
      } else if (response.action === 'open_camera') {
        // Trigger evidence camera
        setShowEvidenceCamera(true);
        // Store flagId for upload
        if (response.data?.flagId) {
          setCurrentFlagId(response.data.flagId as string);
        }
      }

    } catch (error) {
      console.error('Voice command failed', error);
      setStatusMessage('Voice command failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleEvidenceCapture = async () => {
    if (!videoRef.current || !currentFlagId) return;

    // Capture frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    setProcessing(true);
    try {
      await api.addEvidence(currentFlagId, imageData);
      setShowEvidenceCamera(false);
      setCurrentFlagId(null);
      stopScanning(); // Stop camera
      setStatusMessage('Evidence uploaded');
      playVoiceResponse('Evidence uploaded successfully.');
    } catch (e) {
      setStatusMessage('Upload failed');
    } finally {
      setProcessing(false);
    }
  };

  const playVoiceResponse = async (text: string) => {
    // Fire and forget speech generation if just text needed locally, 
    // but better to use the API which might return audio
    try {
      const response = await api.processVoiceCommand(text, undefined, voiceContext); // Pass context
      if (response.context) setVoiceContext(response.context);

      if (response.audioUrl) {
        await playAudio(response.audioUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const playAudio = (url: string) => {
    return new Promise<void>((resolve) => {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onended = () => resolve();
        audioRef.current.play().catch(e => console.error('Audio play error', e));
      } else {
        resolve();
      }
    });
  };

  // Add state for evidence
  const [showEvidenceCamera, setShowEvidenceCamera] = useState(false);
  const [currentFlagId, setCurrentFlagId] = useState<string | null>(null);

  useEffect(() => {
    if (showEvidenceCamera) {
      startScanning(); // Re-use start scanning to open camera
    }
  }, [showEvidenceCamera]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen flex flex-col relative pb-32">
      {/* Header */}
      <header className="p-4 glass sticky top-0 z-40 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">ScanKart Guard</h1>
          <p className="text-xs text-emerald-400">Online • Gate 1</p>
        </div>
        <button
          onClick={() => {
            api.clearToken();
            router.push('/login');
          }}
          className="text-slate-400"
        >
          Logout
        </button>
      </header>

      <div className="flex-1 p-4 flex flex-col items-center">
        {/* Verification Status Card */}
        <div className={`w-full card mb-6 transition-all duration-300 ${verifyResult?.valid
          ? 'status-valid border-green-500/50'
          : verifyResult?.error
            ? 'status-invalid border-red-500/50'
            : 'border-slate-700'
          }`}>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 break-all">
              {verifyResult?.valid ? `Top-up Verified` : statusMessage}
            </h2>
            {verifyResult?.payload && (
              <div className="space-y-2 mt-4 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bill #</span>
                  <span className="font-mono">{verifyResult.payload.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Items</span>
                  <span className="text-xl font-bold">{verifyResult.payload.totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount</span>
                  <span className="text-xl font-bold">₹{verifyResult.payload.totalAmount}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <h3 className="text-sm text-slate-400 mb-2">Items List</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2 text-sm">
                    {verifyResult.payload.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scanner/Camera Area */}
        {(scanning || showEvidenceCamera) ? (
          <div className="relative w-full aspect-square max-w-sm mx-auto mb-6 scanner-frame">
            <video ref={videoRef} className="w-full h-full object-cover" />
            {!showEvidenceCamera && <div className="scan-line" />}

            {showEvidenceCamera ? (
              <button
                onClick={handleEvidenceCapture}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 btn btn-primary px-8 py-3 rounded-full"
              >
                Capture Evidence
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 btn btn-secondary px-4 py-2 text-sm bg-black/50"
              >
                Stop Scanning
              </button>
            )}
          </div>
        ) : (
          !verifyResult && (
            <button
              onClick={startScanning}
              className="w-full max-w-sm aspect-square rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all mb-6 bg-slate-800/50"
            >
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="font-semibold">Tap to Scan QR</span>
            </button>
          )
        )}

        {/* Action Buttons */}
        {verifyResult?.valid && (
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button
              onClick={() => handleVoiceCommand('flag customer')}
              className="btn btn-danger py-3"
            >
              Flag
            </button>
            <button
              onClick={verifyBill}
              className="btn btn-primary py-3 bg-emerald-600"
            >
              Approve
            </button>
          </div>
        )}

      </div>

      {/* Voice Interface Bar */}
      <div className="fixed bottom-0 left-0 right-0 glass p-4 rounded-t-3xl border-t border-emerald-500/20">
        <div className="flex flex-col items-center justify-center relative">
          {voiceTranscript && (
            <div className="absolute -top-12 bg-black/80 px-4 py-2 rounded-full text-sm text-emerald-400 mb-2 whitespace-nowrap">
              "{voiceTranscript}"
            </div>
          )}

          <VoiceButton onCommand={handleVoiceCommand} isProcessing={processing} />

          <p className="text-xs text-slate-500 mt-3">
            Say "Verify Bill", "List Items", or "Flag Customer"
          </p>
        </div>
      </div>
    </main>
  );
}
