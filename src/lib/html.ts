// Escapes user-submitted text before it is injected into raw HTML strings
// (MapLibre marker/popup HTML is built with innerHTML/setHTML, which does
// not auto-escape the way JSX does — anything from Supabase, including
// place names and descriptions submitted through the public backoffice
// form, must be escaped here or it becomes a stored-XSS vector).
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] as string
  ));
}
