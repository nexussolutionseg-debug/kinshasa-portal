// One Kin Weekend event card: optional photo, date badge, category · commune,
// title, start of the text. The whole card opens the event's own page
// (/weekend/[id]) where the full description, photo and link are shown.
import Link from 'next/link';

const safeImg = (u: unknown) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);

export function EventCard({ evt }: { evt: any }) {
  const d = evt.event_date ? new Date(evt.event_date) : null;
  const img = safeImg(evt.image_url);
  return (
    <Link
      href={`/weekend/${evt.id}`}
      className="group h-full bg-white rounded-2xl border border-brand-line shadow-card overflow-hidden flex flex-col no-underline hover:border-brand-blue transition-colors"
    >
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" loading="lazy" className="w-full aspect-[16/9] object-cover bg-brand-bg" />
      )}
      <div className="p-4 flex gap-4 flex-1">
        <div className="shrink-0 w-16 rounded-2xl bg-brand-red text-white flex flex-col items-center justify-center py-2.5 self-start">
          {d ? (
            <>
              <span className="text-[11px] font-bold uppercase">{d.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'Africa/Kinshasa' })}</span>
              <span className="font-display text-2xl font-extrabold leading-none">{d.toLocaleDateString('fr-FR', { day: 'numeric', timeZone: 'Africa/Kinshasa' })}</span>
              <span className="text-[11px] font-bold uppercase">{d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'Africa/Kinshasa' })}</span>
            </>
          ) : (
            <span className="text-xs font-bold">Bientôt</span>
          )}
        </div>
        <div className="min-w-0 flex flex-col">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#7B3FE4]">
            {[evt.category, evt.commune].filter(Boolean).join(' · ')}
          </span>
          <h3 className="font-display text-lg font-bold text-brand-ink leading-snug m-0 mt-0.5 group-hover:text-brand-blue-deep">{evt.title}</h3>
          {evt.description && <p className="text-sm text-brand-muted m-0 mt-1 line-clamp-3">{evt.description}</p>}
          <span className="mt-auto pt-2 text-sm font-bold text-brand-blue-deep">Lire la suite →</span>
        </div>
      </div>
    </Link>
  );
}
