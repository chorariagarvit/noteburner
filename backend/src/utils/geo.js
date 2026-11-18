/**
 * Where is this request coming from? Cloudflare resolves the visitor's country at the edge.
 *
 * Production trusts ONLY `request.cf.country`, which clients cannot influence. The `CF-IPCountry`
 * header is honoured solely when ALLOW_COUNTRY_HEADER=1 is set explicitly (local dev / e2e tests, via the
 * dev script); it is deliberately NOT in wrangler.toml, so a deployed Worker can't be told a country by a caller.
 */
export function readCountry(c) {
  const fromHeader = c.env?.ALLOW_COUNTRY_HEADER === '1' ? c.req.header('cf-ipcountry') : null;
  const raw = fromHeader || c.req.raw?.cf?.country || null;
  const code = raw ? String(raw).trim().toUpperCase() : null;

  if (!code || code === 'XX') return { country: null, anonymizer: false };   // unknown
  if (code === 'T1') return { country: null, anonymizer: true };            // Tor exit node
  return /^[A-Z]{2}$/.test(code) ? { country: code, anonymizer: false } : { country: null, anonymizer: false };
}
