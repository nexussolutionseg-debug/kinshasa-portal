// Partner report (2026-11-10): /rapport/<link>?mois=2026-11.
// What KINSHASA LABEL brought the partner this month: views of their page
// and pop-up, WhatsApp / call / directions / website / Instagram / Facebook /
// share clicks, reviews received, events published. Private link, not
// indexed, no cookie banner or Google Analytics. Counters are anonymous
// (no cookie, no IP) so every visitor is counted, cookie choice or not.
import type { Metadata } from 'next';
import Link from 'next/link';
import { KinshasaMark } from '../../../components/BrandMark';
import { loadPlaceReport, monthRange, shiftMonth } from '../../../lib/placeReport';
import { packOf } from '../../../lib/partners';
import { placeHref } from '../../../lib/places';
import { categoryOf } from '../../../lib/categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rapport partenaire',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

const KPIS: { kind: string; label: string; color: string }[] = [
  { kind: 'view', label: 'Vues de votre fiche', color: '#1A82F5' },
  { kind: 'whatsapp', label: 'Clics WhatsApp', color: '#25D366' },
  { kind: 'call', label: 'Appels', color: '#0B2545' },
  { kind: 'directions', label: 'Itinéraires', color: '#D21C2E' },
];
const MORE: { kind: string; label: string }[] = [
  { kind: 'website', label: 'Clics vers votre site web' },
  { kind: 'instagram', label: 'Clics vers votre Instagram' },
  { kind: 'facebook', label: 'Clics vers votre Facebook' },
  { kind: 'share', label: 'Partages sur WhatsApp' },
];

const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const nf = (n: number) => n.toLocaleString('fr-FR');

export default async function PartnerReportPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ mois?: string }> }) {
  const { token } = await params;
  const { mois } = await searchParams;
  const range = monthRange(mois);
  const current = monthRange(null);
  const [r, prev] = await Promise.all([
    loadPlaceReport(token, range.from, range.to, true),
    loadPlaceReport(token, monthRange(shiftMonth(range.key, -1)).from, monthRange(shiftMonth(range.key, -1)).to, false),
  ]);

  if (!r) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-ink flex items-center justify-center p-6">
        <div className="max-w-md rounded-3xl bg-white border border-brand-line p-8 text-center flex flex-col gap-3 items-center">
          <KinshasaMark size={52} />
          <h1 className="font-display text-2xl font-extrabold m-0">Lien de rapport invalide</h1>
          <p className="text-brand-muted m-0">Ce lien n’existe pas ou a été remplacé. Demandez votre lien à l’équipe : contact@kinshasalabel.com</p>
        </div>
      </main>
    );
  }

  const t = r.totals || {};
  const pt = prev?.totals || {};
  const pack = packOf(r.place.pack);
  const contacts = (t.whatsapp || 0) + (t.call || 0) + (t.directions || 0);
  // Daily views + contacts for the bars.
  const days: { day: string; views: number; contacts: number }[] = [];
  const last = Number(range.to.slice(8, 10));
  for (let d = 1; d <= last; d++) {
    const day = `${range.key}-${String(d).padStart(2, '0')}`;
    const rows = r.daily.filter((x) => String(x.day).slice(0, 10) === day);
    days.push({
      day,
      views: rows.filter((x) => x.kind === 'view').reduce((a, x) => a + x.n, 0),
      contacts: rows.filter((x) => ['whatsapp', 'call', 'directions'].includes(x.kind)).reduce((a, x) => a + x.n, 0),
    });
  }
  const peak = Math.max(1, ...days.map((d) => d.views + d.contacts));
  const delta = (k: string) => {
    const a = t[k] || 0;
    const b = pt[k] || 0;
    if (!prev || (!a && !b)) return null;
    if (!b) return '+ nouveau';
    const pc = Math.round(((a - b) / b) * 100);
    return `${pc >= 0 ? '+' : ''}${pc} % vs ${monthLabel(shiftMonth(range.key, -1))}`;
  };
  const prevKey = shiftMonth(range.key, -1);
  const nextKey = shiftMonth(range.key, 1);
  const q = (k: string) => `/rapport/${token}?mois=${k}`;

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink">
      <header className="bg-white border-b border-brand-line">
        <div className="max-w-[1000px] mx-auto px-4 py-4 flex items-center gap-3">
          <KinshasaMark size={44} />
          <div className="min-w-0">
            <p className="font-display text-xl md:text-2xl font-extrabold m-0 leading-tight">Rapport partenaire</p>
            <p className="text-sm text-brand-muted m-0 truncate">
              <b className="text-brand-ink">{r.place.name}</b> · {r.place.commune}{pack ? ` · ${pack.label}` : ''}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-4 py-6 md:py-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold m-0 first-letter:uppercase">{monthLabel(range.key)}</h1>
          <div className="flex gap-2">
            <Link href={q(prevKey)} className="h-10 px-4 inline-flex items-center rounded-full border-2 border-brand-line bg-white font-bold no-underline text-brand-ink">← {monthLabel(prevKey)}</Link>
            {range.key < current.key && (
              <Link href={q(nextKey)} className="h-10 px-4 inline-flex items-center rounded-full border-2 border-brand-line bg-white font-bold no-underline text-brand-ink">{monthLabel(nextKey)} →</Link>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-brand-ink text-white p-6 md:p-8 flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div>
            <p className="m-0 text-white/70 font-semibold">Contacts générés par KINSHASA LABEL</p>
            <p className="m-0 font-display text-6xl md:text-7xl font-extrabold text-brand-yellow leading-none mt-2">{nf(contacts)}</p>
          </div>
          <p className="m-0 text-white/80 text-sm max-w-sm">WhatsApp, appels et itinéraires lancés depuis KINSHASA LABEL ce mois-ci, sur {nf(t.view || 0)} vues de votre fiche.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KPIS.map((k) => (
            <div key={k.kind} className="rounded-2xl bg-white border border-brand-line p-4" style={{ borderTop: `6px solid ${k.color}` }}>
              <p className="m-0 text-sm font-semibold text-brand-muted">{k.label}</p>
              <p className="m-0 font-display text-4xl font-extrabold mt-1">{nf(t[k.kind] || 0)}</p>
              {delta(k.kind) && <p className="m-0 text-xs text-brand-muted mt-1">{delta(k.kind)}</p>}
            </div>
          ))}
        </div>

        <section className="rounded-3xl bg-white border border-brand-line p-5 md:p-6">
          <h2 className="font-display text-xl font-extrabold m-0 mb-1">Jour par jour</h2>
          <p className="text-xs text-brand-muted m-0 mb-4">
            <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: '#1A82F5' }} /> vues ·{' '}
            <span className="inline-block w-3 h-3 rounded-sm align-middle mx-1" style={{ background: '#D21C2E' }} /> contacts (WhatsApp, appels, itinéraires)
          </p>
          <div className="flex items-end gap-[3px] h-40" role="img" aria-label="Vues et contacts par jour">
            {days.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col justify-end h-full" title={`${Number(d.day.slice(8))} : ${d.views} vue(s), ${d.contacts} contact(s)`}>
                <div style={{ height: `${(d.contacts / peak) * 100}%`, background: '#D21C2E' }} className="rounded-t-sm" />
                <div style={{ height: `${(d.views / peak) * 100}%`, background: '#1A82F5' }} className={d.contacts ? '' : 'rounded-t-sm'} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-brand-muted mt-1"><span>1</span><span>{Math.ceil(last / 2)}</span><span>{last}</span></div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl bg-white border border-brand-line p-5 md:p-6">
            <h2 className="font-display text-xl font-extrabold m-0 mb-3">Autres clics</h2>
            <ul className="list-none p-0 m-0 flex flex-col">
              {MORE.map((k) => (
                <li key={k.kind} className="flex justify-between py-2 border-b border-brand-line last:border-0">
                  <span>{k.label}</span>
                  <b>{nf(t[k.kind] || 0)}</b>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-3xl bg-white border border-brand-line p-5 md:p-6">
            <h2 className="font-display text-xl font-extrabold m-0 mb-3">Avis et événements</h2>
            <ul className="list-none p-0 m-0 flex flex-col">
              <li className="flex justify-between py-2 border-b border-brand-line"><span>Avis reçus ce mois</span><b>{nf(r.reviews?.count || 0)}</b></li>
              <li className="flex justify-between py-2 border-b border-brand-line"><span>Note moyenne ce mois</span><b>{r.reviews?.avg != null ? `${String(r.reviews.avg).replace('.', ',')} / 5` : '—'}</b></li>
              <li className="flex justify-between py-2 border-b border-brand-line">
                <span>Note globale</span>
                <b>{r.place.rating_count ? `${(r.place.rating_sum / r.place.rating_count).toFixed(1).replace('.', ',')} / 5 (${r.place.rating_count} avis)` : '—'}</b>
              </li>
              <li className="flex justify-between py-2"><span>Événements Kin Weekend</span><b>{r.events.length}</b></li>
            </ul>
            {r.events.length > 0 && (
              <ul className="list-none p-0 m-0 mt-2 text-sm text-brand-muted">
                {r.events.map((e) => <li key={e.id}>{new Date(`${e.date}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })} · {e.title}</li>)}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between text-sm text-brand-muted">
          <p className="m-0 max-w-xl">
            Comptage anonyme réalisé par KINSHASA LABEL (sans cookie ni donnée personnelle) sur votre page et votre fiche du site. Pack {pack ? pack.label.replace('Pack ', '') : '—'}
            {r.place.until ? `, valable jusqu’au ${new Date(`${r.place.until}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}` : ''}.
          </p>
          <Link href={placeHref(r.place)} className="h-10 px-4 inline-flex items-center rounded-full bg-brand-ink text-white font-bold no-underline">Voir ma page →</Link>
        </div>
        <p className="text-xs text-brand-muted m-0">{categoryOf(r.place.vertical).label}{r.place.place_type ? ` · ${r.place.place_type}` : ''} · Questions : contact@kinshasalabel.com</p>
      </div>
    </main>
  );
}
