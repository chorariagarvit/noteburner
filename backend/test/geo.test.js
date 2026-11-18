import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCountry } from '../src/utils/geo.js';

// Minimal stand-in for a Hono context
const ctx = ({ header, cf, allow } = {}) => ({
  env: allow ? { ALLOW_COUNTRY_HEADER: '1' } : {},
  req: { header: (k) => (k.toLowerCase() === 'cf-ipcountry' ? header : undefined), raw: { cf: cf ? { country: cf } : undefined } },
});

test('production reads the country Cloudflare resolved (request.cf), normalised to upper case', () => {
  assert.deepEqual(readCountry(ctx({ cf: 'de' })), { country: 'DE', anonymizer: false });
  assert.deepEqual(readCountry(ctx({ cf: 'US' })), { country: 'US', anonymizer: false });
});

test('a caller-supplied CF-IPCountry header is IGNORED unless explicitly enabled', () => {
  assert.deepEqual(readCountry(ctx({ header: 'FR', cf: 'DE' })), { country: 'DE', anonymizer: false });
  assert.deepEqual(readCountry(ctx({ header: 'FR' })), { country: null, anonymizer: false });
});

test('with ALLOW_COUNTRY_HEADER=1 (dev/tests only) the header wins', () => {
  assert.deepEqual(readCountry(ctx({ header: 'fr', cf: 'DE', allow: true })), { country: 'FR', anonymizer: false });
  assert.deepEqual(readCountry(ctx({ cf: 'DE', allow: true })), { country: 'DE', anonymizer: false }); // no header: falls back to cf
});

test('unknown, Tor and malformed values never count as a country', () => {
  assert.deepEqual(readCountry(ctx({ header: 'XX', allow: true })), { country: null, anonymizer: false });
  assert.deepEqual(readCountry(ctx({ header: 'T1', allow: true })), { country: null, anonymizer: true });
  for (const bad of ['', 'USA', '1', 'D', '<script>', 'DE ; DROP']) {
    assert.equal(readCountry(ctx({ header: bad, allow: true })).country, null, bad);
  }
  assert.deepEqual(readCountry(ctx()), { country: null, anonymizer: false });
});
