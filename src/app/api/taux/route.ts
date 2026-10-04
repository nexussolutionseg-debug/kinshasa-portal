// USD ⇄ CDF rate for the Kin Actualité sidebar. mataf.net (from the client's
// source list) is a currency site with no free API or widget, so the number
// comes from ExchangeRate-API's free open endpoint (no key; attribution
// required, shown in the widget) and the widget links to mataf.net for the
// full converter and history. Cached 1 hour.
import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(8000),
      next: { revalidate },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cdf = Number(data?.rates?.CDF);
    const eur = Number(data?.rates?.EUR);
    if (!cdf) throw new Error('no CDF rate');
    return NextResponse.json({
      ok: true,
      usdCdf: cdf,
      eurCdf: eur ? cdf / eur : null,
      updatedAt: data?.time_last_update_utc || null,
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
