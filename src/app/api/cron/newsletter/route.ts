// Weekly newsletter on autopilot (2026-10-13). Vercel runs this every
// Wednesday morning (vercel.json). It:
//   1. builds "Le meilleur de Kin" from the site's content (src/lib/weeklyNewsletter.ts),
//   2. creates the campaign in Brevo for the newsletter list,
//      - NEWSLETTER_AUTOSEND=1 → scheduled for Thursday 10:00 Kinshasa (09:00 UTC);
//        the team can still open it in Brevo and cancel until then,
//      - otherwise → saved as a draft for someone to click "Send" in Brevo,
//   3. emails the team a short report: this week's issue + last week's results
//      (delivered, opened, clicked, unsubscribed) + list size.
// The team only monitors. Nothing is sent when there is nothing to say.
//
// Settings (Vercel → Environment Variables, Production): BREVO_API_KEY and
// BREVO_LIST_ID (already used by sign-ups), CRON_SECRET (Vercel sends it to
// prove the call is the scheduled job), optional NEWSLETTER_AUTOSEND=1 and
// NEWSLETTER_REPORT_TO (default contact@kinshasalabel.com).
import { NextResponse } from 'next/server';
import { serverPlaces, serverEvents } from '../../../../lib/supabaseServer';
import { getNewsFeedSafe } from '../../../../lib/newsFeed';
import { buildIssue, nextThursday } from '../../../../lib/weeklyNewsletter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BREVO = 'https://api.brevo.com/v3';

async function brevo<T = any>(path: string, key: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${BREVO}${path}`, {
    method: init?.method || 'GET',
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo ${path}: HTTP ${res.status} ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)} %` : '–');

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const url = new URL(req.url);
  const now = new Date();

  const [places, events, feed] = await Promise.all([serverPlaces(), serverEvents(), getNewsFeedSafe(12000)]);
  const issue = buildIssue(places, events, feed?.items || [], now);

  // Preview only: /api/cron/newsletter?preview=1 (same secret) returns the email.
  if (url.searchParams.get('preview') === '1') {
    return new NextResponse(issue.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const key = process.env.BREVO_API_KEY;
  const listId = Number(String(process.env.BREVO_LIST_ID || '').replace(/\D/g, ''));
  if (!key || !(listId > 0)) {
    return NextResponse.json({ ok: false, reason: 'BREVO_API_KEY or BREVO_LIST_ID missing' }, { status: 503 });
  }
  const sender = { name: process.env.BREVO_SENDER_NAME || 'Kinshasa Label', email: process.env.BREVO_SENDER_EMAIL || 'contact@kinshasalabel.com' };
  const autosend = process.env.NEWSLETTER_AUTOSEND === '1';

  // Last sent campaign's results + list size, for the report.
  let last: any = null;
  let listSize: number | null = null;
  try {
    const r = await brevo<any>('/emailCampaigns?type=classic&status=sent&limit=1&offset=0&sort=desc&statistics=globalStats', key);
    last = r?.campaigns?.[0] || null;
  } catch (e) {
    console.error('newsletter: stats', String(e));
  }
  try {
    const l = await brevo<any>(`/contacts/lists/${listId}`, key);
    listSize = l?.uniqueSubscribers ?? l?.totalSubscribers ?? null;
  } catch (e) {
    console.error('newsletter: list', String(e));
  }

  let status = 'skipped (nothing new to send this week)';
  let campaignId: number | null = null;
  if (!issue.skip) {
    try {
      const sendAt = nextThursday(now);
      const created = await brevo<{ id: number }>('/emailCampaigns', key, {
        method: 'POST',
        body: {
          name: `Le meilleur de Kin · ${now.toISOString().slice(0, 10)}`,
          subject: issue.subject,
          previewText: issue.preview,
          sender,
          replyTo: sender.email,
          htmlContent: issue.html,
          recipients: { listIds: [listId] },
          ...(autosend ? { scheduledAt: sendAt.toISOString() } : {}),
        },
      });
      campaignId = created?.id ?? null;
      status = autosend
        ? `scheduled for Thursday ${sendAt.toISOString().slice(0, 10)}, 10:00 Kinshasa (cancel in Brevo if needed)`
        : 'saved as a draft in Brevo: open Campaigns and click Send';
    } catch (e) {
      status = `FAILED: ${String(e).slice(0, 200)}`;
      console.error('newsletter: create', String(e));
    }
  }

  // Report to the team (transactional email).
  const g = last?.statistics?.globalStats || {};
  const delivered = Number(g.delivered || g.sent || 0);
  const lines = [
    `This week's issue: ${status}`,
    `Subject: ${issue.subject}`,
    `Content: ${issue.counts.events} events, ${issue.counts.places} places, ${issue.counts.news} news headlines`,
    ``,
    `Newsletter list: ${listSize ?? '–'} contacts`,
    last
      ? `Last issue (${String(last.sentDate || '').slice(0, 10)}): ${delivered} delivered · opened ${pct(Number(g.uniqueViews || 0), delivered)} · clicked ${pct(Number(g.uniqueClicks || 0), delivered)} · ${Number(g.unsubscriptions || 0)} unsubscribed`
      : 'Last issue: no sent campaign yet',
  ];
  try {
    await brevo('/smtp/email', key, {
      method: 'POST',
      body: {
        sender,
        to: [{ email: process.env.NEWSLETTER_REPORT_TO || 'contact@kinshasalabel.com' }],
        subject: `Newsletter Kinshasa Label · ${issue.skip ? 'skipped' : autosend ? 'scheduled' : 'draft ready'} · ${now.toISOString().slice(0, 10)}`,
        textContent: lines.join('\n'),
        tags: ['rapport-newsletter'],
      },
    });
  } catch (e) {
    console.error('newsletter: report', String(e));
  }

  return NextResponse.json({ ok: !status.startsWith('FAILED'), status, campaignId, counts: issue.counts, listSize });
}
