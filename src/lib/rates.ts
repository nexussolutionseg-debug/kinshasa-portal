// USD ⇄ CDF reference rate (ExchangeRate-API free endpoint, attribution
// shown in the widget). Shared by /api/taux and server-rendered pages.
export type Rate = { ok: boolean; usdCdf?: number; eurCdf?: number | null; updatedAt?: string | null };

export async function getRate(): Promise<Rate> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cdf = Number(data?.rates?.CDF);
    const eur = Number(data?.rates?.EUR);
    if (!cdf) throw new Error('no CDF rate');
    return { ok: true, usdCdf: cdf, eurCdf: eur ? cdf / eur : null, updatedAt: data?.time_last_update_utc || null };
  } catch {
    return { ok: false };
  }
}
