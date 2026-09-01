'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';

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
      setErrorMsg("Une erreur inattendue s'est produite lors de la connexion.");
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
          <h1 className="font-display text-lg font-semibold tracking-wide m-0 text-brand-cream">
            Kinshasa Label — Backoffice
          </h1>
        </div>
        <Button href="/" variant="secondary" size="sm">
          Retour au Média
        </Button>
      </nav>

      {/* Center Access Card */}
      <div className="flex-1 flex items-center justify-center py-10">
        <div className="bg-brand-navy-light border border-brand-navy-border rounded-2xl p-8 max-w-[440px] w-full shadow-[0_20px_40px_rgba(0,0,0,0.7)] box-border">

          {/* Card Sub-header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-brand-river text-[11px] font-bold uppercase tracking-wide">
                Accès Réservé
              </span>
              <span className="bg-brand-navy text-brand-green text-[11px] px-2.5 py-1 rounded-xl border border-brand-navy-border font-bold">
                ● Système Actif
              </span>
            </div>

            <h2 className="font-display text-4xl font-semibold mt-1 mb-1.5 text-brand-cream tracking-tight">
              Connexion
            </h2>
            <p className="text-sm text-brand-muted m-0 leading-snug">
              Réservé à l'équipe éditoriale de Kinshasa Label.
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
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@kinshasa-label.cd"
                  className={inputClass}
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-brand-muted tracking-wide mb-1.5">
                  Mot de passe
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
            <Button type="submit" disabled={loading} variant="primary" size="lg" fullWidth className="mt-1">
              {loading ? 'Connexion en cours...' : 'Se connecter →'}
            </Button>
          </form>

        </div>
      </div>

      {/* Footer Line */}
      <footer className="flex justify-between items-center pt-3 border-t border-brand-navy-border text-[11px] text-brand-muted max-w-[1600px] w-full mx-auto">
        <span>KINSHASA LABEL</span>
        <span className="text-brand-green font-bold">● Connexion sécurisée</span>
      </footer>

    </main>
  );
}
