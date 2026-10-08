// One Kin Weekend event (date badge + category · commune + title + text).
export function EventCard({ evt }: { evt: any }) {
  const d = evt.event_date ? new Date(evt.event_date) : null;
  return (
    <article className="h-full bg-white rounded-2xl border border-brand-line shadow-card p-4 flex gap-4">
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
      <div className="min-w-0">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#7B3FE4]">
          {[evt.category, evt.commune].filter(Boolean).join(' · ')}
        </span>
        <h3 className="font-display text-lg font-bold text-brand-ink leading-snug m-0 mt-0.5">{evt.title}</h3>
        {evt.description && <p className="text-sm text-brand-muted m-0 mt-1 line-clamp-3">{evt.description}</p>}
      </div>
    </article>
  );
}
