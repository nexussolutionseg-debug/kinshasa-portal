// Place pin for MapLibre markers (home + commune maps).
//
// MapLibre positions a marker by writing `transform: translate(...)` and
// `position: absolute` on the OUTER element. The previous pins set
// `position: relative` and, on hover/tap, replaced `transform` with
// `scale(1.15)` — wiping MapLibre's translate, so the tapped pin jumped to
// the top-left corner of the map (client report 2026-10-04). Now the outer
// element is left to MapLibre; all visuals and the hover scale live on an
// inner dot, and the name label is a sibling of that dot.
import { escapeHtml } from './html';

export function createPlacePin(opts: { name: string; color: string; rating: number | null; onSelect: () => void }) {
  const { name, color, rating, onSelect } = opts;

  const el = document.createElement('button');
  el.type = 'button';
  el.title = name;
  el.setAttribute('aria-label', name);
  // size + reset only — never `position` or `transform` on this element
  el.style.cssText = 'width:34px;height:34px;padding:0;margin:0;border:0;background:transparent;cursor:pointer;';

  const dot = document.createElement('span');
  dot.style.cssText = `display:block;width:30px;height:30px;margin:2px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 6px 14px -4px rgba(11,37,69,.55);transition:transform .15s;box-sizing:border-box;`;
  el.appendChild(dot);

  const label = document.createElement('span');
  label.style.cssText =
    'position:absolute;left:50%;bottom:calc(100% + 4px);transform:translateX(-50%);background:#fff;color:#0B2545;font:700 11px system-ui,sans-serif;padding:4px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 6px 16px -6px rgba(11,37,69,.45);display:none;pointer-events:none;';
  label.innerHTML = `${escapeHtml(name)}${rating !== null ? ` <span style="color:#B98A00">★ ${rating.toFixed(1)}</span>` : ''}`;
  el.appendChild(label);

  const show = () => {
    label.style.display = 'block';
    dot.style.transform = 'scale(1.15)';
    el.style.zIndex = '5';
  };
  const hide = () => {
    label.style.display = 'none';
    dot.style.transform = '';
    el.style.zIndex = '';
  };
  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hide);
  el.addEventListener('focus', show);
  el.addEventListener('blur', hide);
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    onSelect();
  });
  return el;
}
