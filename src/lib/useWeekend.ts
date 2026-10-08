'use client';
// Whether Kin Weekend has enough upcoming events to be shown in the menus.
// One request per page load, shared by the header and the bottom tab bar.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { WEEKEND_MIN } from './events';

let pending: Promise<number> | null = null;

function countUpcoming(): Promise<number> {
  if (!pending) {
    const today = new Date().toISOString().slice(0, 10);
    pending = Promise.resolve(
      supabase.from('events').select('id', { count: 'exact', head: true }).or(`event_date.gte.${today},event_date.is.null`)
    )
      .then(({ count }) => count || 0)
      .catch(() => 0);
  }
  return pending;
}

export function useWeekendOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    countUpcoming().then((n) => setOn(n >= WEEKEND_MIN));
  }, []);
  return on;
}
