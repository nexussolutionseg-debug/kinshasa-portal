// Anonymous place counters for partner reports (2026-11-10): adds 1 to
// "place 42, today, whatsapp" through the database function track_place().
// No cookie, no IP, no visitor id, so it runs whatever the cookie choice.
// A view is counted once per place per browser tab session.
'use client';

import { supabase } from './supabase';

export type TrackKind = 'view' | 'whatsapp' | 'call' | 'directions' | 'website' | 'instagram' | 'facebook' | 'share';
const KINDS = new Set<TrackKind>(['view', 'whatsapp', 'call', 'directions', 'website', 'instagram', 'facebook', 'share']);

export function trackPlace(placeId: number | string | null | undefined, kind: TrackKind) {
  const id = Number(placeId);
  if (!Number.isFinite(id) || id <= 0 || !KINDS.has(kind)) return;
  if (kind === 'view') {
    try {
      const key = `kl_seen_${id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* private mode: count anyway */
    }
  }
  // Fire and forget; before the SQL is run the function doesn't exist and this fails silently.
  supabase.rpc('track_place', { p_place_id: id, p_kind: kind }).then(() => undefined, () => undefined);
}

let installs = 0;
let remove: (() => void) | null = null;

/** Links/buttons with data-track="whatsapp" data-place="42" are counted when clicked (one listener however many callers). */
export function installClickTracking(): () => void {
  installs++;
  if (!remove) remove = listen();
  return () => {
    installs--;
    if (installs === 0 && remove) {
      remove();
      remove = null;
    }
  };
}

function listen(): () => void {
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.('[data-track][data-place]') as HTMLElement | null;
    if (!el) return;
    const kind = el.dataset.track as TrackKind;
    if (KINDS.has(kind) && kind !== 'view') trackPlace(el.dataset.place, kind);
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
