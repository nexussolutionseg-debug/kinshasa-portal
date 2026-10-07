// The picture shown when someone shares a kinshasalabel.com link on
// WhatsApp, Instagram DMs, Facebook or X. Generated at build time.
import { ImageResponse } from 'next/og';

export const alt = 'Kinshasa Label — Vis Kin autrement';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  const dots = ['#1A82F5', '#F5B400', '#D21C2E', '#1A82F5', '#F5B400', '#D21C2E', '#1A82F5', '#F5B400'];
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(120deg,#0A2A66 0%,#1A82F5 100%)', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {dots.map((c, i) => <div key={i} style={{ width: 22, height: 22, borderRadius: 11, background: c }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>Kinshasa Label</div>
          <div style={{ fontSize: 44, marginTop: 8, color: '#FFE36B' }}>Vis Kin autrement</div>
          <div style={{ fontSize: 30, marginTop: 28, opacity: 0.9 }}>Bonnes adresses · Sorties · Actualité · 24 communes</div>
        </div>
        <div style={{ display: 'flex', height: 12, width: '100%' }}>
          <div style={{ flex: 1, background: '#1A82F5' }} />
          <div style={{ flex: 1, background: '#F5B400' }} />
          <div style={{ flex: 1, background: '#D21C2E' }} />
        </div>
      </div>
    ),
    size
  );
}
