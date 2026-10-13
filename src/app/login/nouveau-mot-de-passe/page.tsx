'use client';
// Opened from the "Choisis un nouveau mot de passe" email (2026-10-13).
// Supabase puts a one-time recovery session in the link; the browser client
// picks it up automatically, then we ask for the new password.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/Button';
import { KinshasaMark } from '../../../components/BrandMark';

export default function NewPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<'checking' | 'ok' | 'expired'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let settled = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        settled = true;
        setReady('ok');
      }
    });
    // Link already processed (or the person was signed in): a session exists.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        settled = true;
        setReady('ok');
      }
    });
    const t = window.setTimeout(() => !settled && setReady('expired'), 4000);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < 8) return setErrorMsg('Au moins 8 caractères.');
    if (password !== confirm) return setErrorMsg('Les deux mots de passe ne sont pas identiques.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErrorMsg(/same|different/i.test(error.message) ? "Choisis un mot de passe différent de l'ancien." : 'Le lien a expiré. Redemande un e-mail depuis la page de connexion.');
      return;
    }
    setDone(true);
    window.setTimeout(() => router.push('/backoffice'), 1500);
  };

  const inputClass =
    'w-full box-border bg-brand-surface border border-brand-line rounded-lg px-3 py-2.5 text-brand-ink text-base outline-none focus:border-brand-blue';

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink p-5 flex items-center justify-center">
      <div className="bg-brand-surface border border-brand-line rounded-2xl p-8 max-w-[440px] w-full shadow-lift">
        <div className="flex items-center gap-2.5 mb-5">
          <KinshasaMark size={30} />
          <span className="font-display text-lg font-extrabold">
            Kinshasa <span className="text-brand-red">Label</span>
          </span>
        </div>
        <h1 className="font-display text-3xl font-extrabold m-0 mb-2">Nouveau mot de passe</h1>

        {ready === 'checking' && <p className="text-sm text-brand-muted">Vérification du lien…</p>}

        {ready === 'expired' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-brand-muted m-0">Ce lien n&apos;est plus valable ou a déjà servi. Redemande un e-mail.</p>
            <Button href="/login" variant="primary" size="md" fullWidth>
              Retour à la connexion
            </Button>
          </div>
        )}

        {ready === 'ok' &&
          (done ? (
            <p className="bg-brand-blue-soft text-brand-blue-deep rounded-xl p-4 text-sm font-bold m-0">
              Mot de passe enregistré. Ouverture du backoffice…
            </p>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4 mt-2">
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe (8 caractères min.)"
                className={inputClass}
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirme le mot de passe"
                className={inputClass}
              />
              {errorMsg && <p className="text-sm text-brand-danger font-semibold m-0">{errorMsg}</p>}
              <Button type="submit" disabled={loading} variant="primary" size="lg" fullWidth>
                {loading ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </form>
          ))}
      </div>
    </main>
  );
}
