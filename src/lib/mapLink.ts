// Read a position from anything the team pastes: GPS, plus code, a full
// Google Maps / OpenStreetMap link, or a Google Maps short share link
// (resolved by /api/map-link). 2026-11-12.
'use client';

import { supabase } from './supabase';
import { parsePosition, isShortMapLink } from './geo';

export async function resolvePosition(input: string): Promise<{ lat: number; lng: number } | { error: string } | null> {
  const local = parsePosition(input);
  if (local) return local;
  if (!isShortMapLink(input) && !/google\.[a-z.]+\/maps|maps\.google\./i.test(input)) return null;
  const { data } = await supabase.auth.getSession();
  try {
    const r = await fetch(`/api/map-link?url=${encodeURIComponent(input.trim())}`, {
      headers: { Authorization: `Bearer ${data.session?.access_token || ''}` },
    });
    const j = await r.json();
    return j.ok ? { lat: j.lat, lng: j.lng } : { error: j.error || 'Lien non reconnu.' };
  } catch {
    return { error: 'Lecture du lien impossible pour le moment.' };
  }
}
