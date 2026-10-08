'use client';
// "il y a 12 min" computed in the browser only. Pages are rendered ahead of
// time on the server, so a relative time written there would be stale and
// differ from the browser's (React hydration error). Until mounted, show
// the absolute date, which is identical on both sides.
import { useEffect, useState } from 'react';
import { timeAgo } from '../lib/news';

export function TimeAgo({ iso }: { iso: string | null | undefined }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  if (!iso) return null;
  if (now === null) {
    return <time dateTime={iso}>{new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Kinshasa' })}</time>;
  }
  return <time dateTime={iso}>{timeAgo(iso, now)}</time>;
}
