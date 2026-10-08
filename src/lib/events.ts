// Kin Weekend rule (client audit, 2026-10-08): the Weekend menu entry,
// tile and hero slide only appear once there are at least WEEKEND_MIN
// upcoming events, so visitors never land on an empty programme.
export const WEEKEND_MIN = 5;

export function upcoming<T extends { event_date?: string | null }>(events: T[]): T[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.filter((e) => !e.event_date || new Date(e.event_date) >= today);
}
