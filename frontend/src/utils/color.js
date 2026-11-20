// Colour helpers for user-chosen brand colours (WCAG relative luminance and contrast).

/** '#rgb' or '#rrggbb' -> [r, g, b] (0-255), or null when it is not a valid hex colour. */
export function parseHex(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
}

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]) {
  const channel = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two [r, g, b] colours, 1 to 21. */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white (pure black: it is the only dark text that reaches 4.5:1 on mid-tone colours), whichever is easier to read on `background` (falls back to white for invalid input). */
export function readableTextColor(background) {
  const rgb = parseHex(background);
  if (!rgb) return '#ffffff';
  return contrastRatio(rgb, [255, 255, 255]) >= contrastRatio(rgb, [0, 0, 0]) ? '#ffffff' : '#000000';
}
