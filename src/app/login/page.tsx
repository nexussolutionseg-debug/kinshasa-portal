'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { KinshasaMark } from '../../components/BrandMark';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login');

  // "Continuer avec Google" (2026-11-01). Google sends the person back here:
  // on success Supabase puts the session in the address and we go on to the
  // backoffice; on refusal (Google account not on the team: public sign-ups
  // are off in Supabase) we show why. Only accounts that already exist in
  // Supabase Auth with the same e-mail can get in, and only team accounts
  // (kl_admins) can change anything.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
    const err = params.get('error_description') || params.get('error');
    if (err) {
      setErrorMsg(
        /signup|sign up|not allowed|user not found|database error saving new user/i.test(err)
          ? 'Ce compte Google ne fait pas partie de l’équipe Kinshasa Label. Utilise le compte Google de ton adresse équipe, ou demande à un administrateur de t’ajouter.'
          : `Connexion Google impossible : ${err.replace(/\+/g, ' ')}`,
      );
      window.history.replaceState(null, '', '/login');
    }
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace('/backoffice'); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) router.replace('/backoffice'); });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const handleGoogle = async () => {
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login`, queryParams: { prompt: 'select_account' } },
    });
    if (error) {
      setLoading(false);
      setErrorMsg(/provider is not enabled|unsupported provider/i.test(error.message)
        ? 'La connexion Google n’est pas encore activée dans Supabase (Authentication → Providers → Google).'
        : error.message);
    }
  };

  // "Mot de passe oublié" (2026-10-13): Supabase emails a reset link (branded
  // template + Kinshasa Label sender, see supabase/email-templates/README.md)
  // that opens /login/nouveau-mot-de-passe. The message is the same whether
  // or not the address has an account, so nobody can probe who is on the team.
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login/nouveau-mot-de-passe`,
    });
    setLoading(false);
    if (error && /rate|too many|seconds/i.test(error.message)) {
      setErrorMsg('Trop de demandes. Réessaie dans quelques minutes.');
      return;
    }
    setMode('sent');
  };

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

  const inputClass = "w-full box-border bg-brand-surface border border-brand-line rounded-lg px-3 py-2.5 text-brand-ink text-sm outline-none focus:border-brand-red";

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink p-5 flex flex-col justify-between box-border">

      {/* Top Navigation Bar */}
      <nav className="flex justify-between items-center pb-3 border-b border-brand-line max-w-[1600px] w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <KinshasaMark size={30} />
          <h1 className="font-display text-lg font-semibold tracking-wide m-0 text-brand-ink">
            Kinshasa Label — Backoffice
          </h1>
        </div>
        <Button href="/" variant="secondary" size="sm">
          Retour au Média
        </Button>
      </nav>

      {/* Center Access Card */}
      <div className="flex-1 flex items-center justify-center py-10">
        <div className="bg-brand-surface border border-brand-line rounded-2xl p-8 max-w-[440px] w-full shadow-[0_20px_40px_rgba(0,0,0,0.7)] box-border">

          {/* Card Sub-header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-brand-blue text-[11px] font-bold uppercase tracking-wide">
                Accès Réservé
              </span>
              <span className="bg-brand-bg text-brand-blue-deep text-[11px] px-2.5 py-1 rounded-xl border border-brand-line font-bold">
                ● Système Actif
              </span>
            </div>

            <h2 className="font-display text-4xl font-semibold mt-1 mb-1.5 text-brand-ink tracking-tight">
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

          {mode === 'sent' && (
            <div className="flex flex-col gap-4">
              <p className="bg-brand-blue-soft text-brand-blue-deep rounded-xl p-4 text-sm font-semibold m-0 leading-relaxed">
                Si cette adresse fait partie de l&apos;équipe, un e-mail avec un lien pour choisir un nouveau mot de passe vient
                de partir. Pense à regarder dans les spams.
              </p>
              <Button type="button" variant="secondary" size="md" fullWidth onClick={() => setMode('login')}>
                ← Retour à la connexion
              </Button>
            </div>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <p className="text-sm text-brand-muted m-0 leading-snug">
                Indique ton e-mail : tu recevras un lien pour choisir un nouveau mot de passe.
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className={inputClass}
              />
              <Button type="submit" disabled={loading} variant="primary" size="lg" fullWidth>
                {loading ? 'Envoi…' : 'Recevoir le lien'}
              </Button>
              <button type="button" onClick={() => setMode('login')} className="text-sm font-semibold text-brand-muted hover:text-brand-ink cursor-pointer">
                ← Retour à la connexion
              </button>
            </form>
          )}

          {/* Login Form */}
          {mode === 'login' && (
          <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full min-h-12 rounded-xl border-2 border-brand-line bg-white text-brand-ink font-bold text-sm cursor-pointer hover:border-brand-blue disabled:opacity-60"
          >
            Continuer avec Google
          </button>
          <div className="flex items-center gap-3 my-4 text-[11px] font-bold uppercase tracking-wide text-brand-muted">
            <span className="h-px flex-1 bg-brand-line" /> ou avec ton e-mail <span className="h-px flex-1 bg-brand-line" />
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="bg-brand-bg border border-brand-line rounded-xl p-4 flex flex-col gap-4">

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
                  placeholder="ton@email.com"
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
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setMode('forgot');
              }}
              className="text-sm font-semibold text-brand-blue-deep hover:underline cursor-pointer"
            >
              Mot de passe oublié ?
            </button>
          </form>
          </>
          )}

        </div>
      </div>

      {/* Footer Line */}
      <footer className="flex justify-between items-center pt-3 border-t border-brand-line text-[11px] text-brand-muted max-w-[1600px] w-full mx-auto">
        <span>KINSHASA LABEL</span>
        <span className="text-brand-blue-deep font-bold">● Connexion sécurisée</span>
      </footer>

    </main>
  );
}
