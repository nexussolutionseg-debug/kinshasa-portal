// Backoffice state in the address bar (2026-11-10): the open section, tab
// and item being edited live in the URL (?s=leads&tab=import&edit=42), so
// a refresh, a bookmark or a link sent to a teammate reopens the same page,
// and the browser's Back button goes back to the previous section.
'use client';

import { useCallback, useEffect, useState } from 'react';

export function readParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

/** Set / remove query params. push = new history entry (sections); otherwise replace (tabs, edits). */
export function writeParams(values: Record<string, string | null | undefined>, push = false) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(values)) {
    if (v === null || v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  if (push) window.history.pushState(window.history.state, '', next);
  else window.history.replaceState(window.history.state, '', next);
  window.dispatchEvent(new Event('kl:urlstate'));
}

/**
 * A string state kept in the URL. `def` is never written (clean URLs);
 * values outside `allowed` fall back to `def`. `clear` lists params to drop
 * when this one changes (e.g. the section clears tab and edit).
 */
export function useUrlState<T extends string>(
  key: string,
  def: T,
  allowed: readonly T[],
  opts: { push?: boolean; clear?: string[] } = {}
): [T, (v: T) => void] {
  const allowedKey = allowed.join(',');
  const pick = useCallback(
    (v: string | null): T => (v && allowedKey.split(',').includes(v) ? (v as T) : def),
    [allowedKey, def]
  );
  const [value, setValue] = useState<T>(def);
  useEffect(() => {
    const sync = () => setValue(pick(readParam(key)));
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('kl:urlstate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('kl:urlstate', sync);
    };
  }, [key, pick]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      const extra = Object.fromEntries((opts.clear || []).map((k) => [k, null]));
      writeParams({ ...extra, [key]: v === def ? null : v }, !!opts.push);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, def, opts.push, (opts.clear || []).join(',')]
  );
  return [value, set];
}
