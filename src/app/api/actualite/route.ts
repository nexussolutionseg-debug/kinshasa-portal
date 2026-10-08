// Kin Actualité feed for the browser (pages also render it on the server,
// see src/lib/newsFeed.ts). Cached 15 minutes (ISR): visitors always get
// an instant cached response, refreshed in the background.
import { NextResponse } from 'next/server';
import { getNewsFeed } from '../../../lib/newsFeed';

export const revalidate = 900;
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(await getNewsFeed());
}
