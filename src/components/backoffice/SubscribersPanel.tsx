// Backoffice → "Abonnés newsletter": lists the emails collected by the
// footer form / popup (public.subscribers) and exports them as a CSV that
// imports straight into Brevo, Mailchimp, etc.
//
// Reading this table requires a signed-in team account: the database only
// lets anonymous visitors INSERT an address, never read the list (see
// supabase/security-hardening.sql). If the list comes back empty while you
// know people subscribed, that SQL hasn't been applied yet.
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../Button';

export function SubscribersPanel() {
  const [rows, setRows] = useState<{ email: string; created_at: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('subscribers')
      .select('email, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setRows(data || []);
      });
  }, []);

  const exportCsv = () => {
    if (!rows) return;
    const csv = ['email,date_inscription', ...rows.map((r) => `${r.email.replace(/[",\n]/g, '')},${r.created_at}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `abonnes-kinshasa-label-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-brand-surface border border-brand-line rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-xl text-brand-blue mt-0 mb-0 font-semibold">
          Abonnés newsletter {rows ? `(${rows.length})` : ''}
        </h2>
        <Button variant="primary" onClick={exportCsv} disabled={!rows || rows.length === 0}>
          Exporter en CSV
        </Button>
      </div>
      <p className="text-xs text-brand-muted mb-4 leading-relaxed">
        Importez le CSV dans votre outil d&apos;emailing (Brevo, Mailchimp…). Chaque envoi doit contenir un lien de
        désinscription — ces outils l&apos;ajoutent automatiquement.
      </p>
      {error && <p className="text-sm text-brand-danger">Lecture impossible : {error}</p>}
      {rows === null ? (
        <p className="text-sm text-brand-muted">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-brand-muted">Aucun abonné visible pour le moment.</p>
      ) : (
        <ul className="list-none p-0 m-0 max-h-[480px] overflow-y-auto divide-y divide-brand-line">
          {rows.map((r) => (
            <li key={r.email} className="flex justify-between gap-3 py-2 text-sm">
              <span className="text-brand-ink">{r.email}</span>
              <span className="text-brand-muted">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
