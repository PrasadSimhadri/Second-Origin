'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { api } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      api.setToken(session.access_token);
      try {
        const profile = await api.getProfile();
        if (profile.role === 'admin') router.replace('/admin/dashboard');
        else if (profile.role === 'guard') router.replace('/guard/dashboard');
        else router.replace('/scan');
      } catch {
        // If profile fetch fails, stay on landing or go to login?
        // Stay on landing allows them to click login and fix it.
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        {/* Logo */}
        <div className="mb-12 text-center">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 mx-auto shadow-2xl shadow-blue-500/30">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-3">
            ScanKart
          </h1>
          <p className="text-slate-400 text-xl">Scan. Pay. Go!</p>
        </div>

        {/* App Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-12">
          {/* Customer App */}
          <Link href="/customer" className="group">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 text-center transition-all hover:scale-105 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10">
              <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Customer</h2>
              <p className="text-slate-400 text-sm">Scan products & checkout</p>
            </div>
          </Link>

          {/* Guard App */}
          <Link href="/guard" className="group">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 text-center transition-all hover:scale-105 hover:border-green-500/50 hover:shadow-xl hover:shadow-green-500/10">
              <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Guard</h2>
              <p className="text-slate-400 text-sm">Verify QR codes at exit</p>
            </div>
          </Link>

          {/* Admin App */}
          <Link href="/admin" className="group">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 text-center transition-all hover:scale-105 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/30">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Admin</h2>
              <p className="text-slate-400 text-sm">Manage & monitor</p>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <div className="flex items-center gap-4 bg-slate-800/30 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Fast Checkout</div>
              <div className="text-sm text-slate-400">Skip the queues</div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/30 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Secure</div>
              <div className="text-sm text-slate-400">Signed QR codes</div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/30 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Voice Support</div>
              <div className="text-sm text-slate-400">Hands-free operation</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
