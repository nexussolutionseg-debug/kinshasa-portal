// USD ⇄ CDF rate for the Kin Actualité sidebar (see src/lib/rates.ts). Cached 1 hour.
import { NextResponse } from 'next/server';
import { getRate } from '../../../lib/rates';

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(await getRate());
}
