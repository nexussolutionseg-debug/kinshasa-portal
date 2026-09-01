'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        router.push('/backoffice');
      }
    } catch (err: any) {
      setErrorMsg('An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full box-border bg-brand-navy-light border border-brand-navy-border rounded-lg px-3 py-2.5 text-brand-cream text-sm outline-none focus:border-brand-gold";

  return (
    <main className="min-h-screen bg-brand-navy text-brand-cream p-5 flex flex-col justify-between box-border">

      {/* Top Navigation Bar */}
      <nav className="flex justify-between items-center pb-3 border-b border-brand-navy-border max-w-[1600px] w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-brand-green shadow-[0_0_10px_#2F6B45]" />
          <h1 className="text-lg font-bold uppercase tracking-wide m-0 text-brand-cream">
            Kinshasa Urban Intelligence Portal
          </h1>
        </div>
        <Link
          href="/"
          className="bg-brand-danger text-brand-cream px-4 py-2 rounded-lg no-underline font-bold text-xs uppercase tracking-wide"
        >
          Return to Portal Map
        </Link>
      </nav>

      {/* Center Command Access Card */}
      <div className="flex-1 flex items-center justify-center py-10">
        <div className="bg-brand-navy-light border border-brand-navy-border rounded-2xl p-8 max-w-[440px] w-full shadow-[0_20px_40px_rgba(0,0,0,0.7)] box-border">

          {/* Card Sub-header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-brand-river text-[11px] font-bold uppercase tracking-wide">
                Zone Access Control
              </span>
              <span className="bg-brand-navy text-brand-green text-[11px] px-2.5 py-1 rounded-xl border border-brand-navy-border font-bold">
                ● Live System
              </span>
            </div>

            <h2 className="text-[32px] font-black uppercase mt-1 mb-1.5 text-brand-cream tracking-wide">
              Press Gate
            </h2>
            <p className="text-[13px] text-brand-muted m-0 leading-snug">
              Authorized journalist login for dispatching real-time sector alerts.
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="bg-brand-danger/15 border border-brand-danger text-brand-danger p-3 rounded-xl text-xs font-bold mb-5 text-center">
              {errorMsg}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="bg-brand-navy border border-brand-navy-border rounded-xl p-4 flex flex-col gap-4">

              {/* Email Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-brand-muted tracking-wide mb-1.5">
                  Press Clearance Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="press@kinshasa-portal.cd"
                  className={inputClass}
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-brand-muted tracking-wide mb-1.5">
                  Security Key
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={inputClass}
                />
              </div>

            </div>

            {/* Launch Backoffice Button */}
            <button
              type="submit"
              disabled={loading}
              className={`text-brand-navy rounded-xl p-3.5 font-bold text-[13px] uppercase tracking-wide mt-1 border-none transition-colors ${
                loading ? 'bg-brand-gold-light cursor-not-allowed' : 'bg-brand-gold cursor-pointer hover:bg-brand-gold-light'
              }`}
            >
              {loading ? 'Authenticating Credentials...' : 'Launch Backoffice Hub →'}
            </button>
          </form>

          {/* Status Metrics Box */}
          <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-brand-navy-border">
            <div className="bg-brand-navy px-3 py-2.5 rounded-lg border border-brand-navy-border">
              <span className="text-[10px] text-brand-muted uppercase block">Security Protocol</span>
              <p className="text-xs font-bold text-brand-green mt-0.5 mb-0">Encrypted / Active</p>
            </div>
            <div className="bg-brand-navy px-3 py-2.5 rounded-lg border border-brand-navy-border">
              <span className="text-[10px] text-brand-muted uppercase block">Clearance Level</span>
              <p className="text-xs font-bold text-brand-river mt-0.5 mb-0">Level 2 Journalist</p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Line */}
      <footer className="flex justify-between items-center pt-3 border-t border-brand-navy-border text-[11px] text-brand-muted max-w-[1600px] w-full mx-auto">
        <span>KINSHASA URBAN OPERATIONS PLATFORM</span>
        <span className="text-brand-river font-mono">SUPABASE AUTH CONNECTED</span>
      </footer>

    </main>
  );
}
