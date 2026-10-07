// The Kin Actu headline strip for every public page (the homepage passes
// its own, already-loaded copy). Pinned inside the sticky header, so it
// stays on screen while scrolling. Turned off with Backoffice → Vitrine →
// Sections → news ticker, like on the homepage.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useKinNews, NewsTicker } from './KinNews';
import { loadSiteSettings } from '../lib/siteSettings';

export function SiteTicker() {
  const news = useKinNews();
  const [on, setOn] = useState(true);
  useEffect(() => {
    loadSiteSettings().then((s) => setOn(s.ticker !== false));
  }, []);
  const items = useMemo(() => [...news.pinned, ...(news.live || [])], [news.pinned, news.live]);
  return on ? <NewsTicker items={items} /> : null;
}
