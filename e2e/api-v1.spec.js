/**
 * Public API (/api/v1, API-key authenticated): tenant isolation and input validation.
 * API only, so Chromium only.
 */
import { test, expect } from './fixtures.js';
import { API, IV, createMessage, newUser, newApiKey, bareContext } from './api-helpers.js';
import { encryptMessage, deriveAuthTag } from '../frontend/src/utils/crypto.js';

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent');
});

const body = (extra = {}) => ({ encryptedData: 'cipher-text', iv: IV, salt: IV, ...extra });

async function twoTenants(request) {
  const a = await newUser(request); const b = await newUser(request);
  return { a, b, keyA: await newApiKey(request, a), keyB: await newApiKey(request, b) };
}

test.describe('Tenant isolation', () => {
  test('one key can never read, list, delete or count another user\'s messages', async ({ request, playwright }) => {
    const { keyA, keyB } = await twoTenants(request);
    const bare = await bareContext(playwright);
    const mine = await bare.post(`${API}/v1/messages`, { headers: keyA.headers, data: body() });
    expect(mine.status(), await mine.text()).toBe(201);
    const { token } = await mine.json();

    // owner sees it
    expect((await bare.get(`${API}/v1/messages/${token}`, { headers: keyA.headers })).status()).toBe(200);
    const listA = await (await bare.get(`${API}/v1/messages`, { headers: keyA.headers })).json();
    expect(listA.messages.map((m) => m.token)).toContain(token);
    expect((await (await bare.get(`${API}/v1/stats`, { headers: keyA.headers })).json()).stats.total_messages).toBe(1);

    // another tenant sees nothing, can't delete, and the message survives the attempt
    expect((await bare.get(`${API}/v1/messages/${token}`, { headers: keyB.headers })).status()).toBe(404);
    expect((await bare.delete(`${API}/v1/messages/${token}`, { headers: keyB.headers })).status()).toBe(404);
    const listB = await (await bare.get(`${API}/v1/messages`, { headers: keyB.headers })).json();
    expect(listB.messages).toEqual([]);
    expect(listB.pagination.total).toBe(0);
    expect((await (await bare.get(`${API}/v1/stats`, { headers: keyB.headers })).json()).stats.total_messages).toBe(0);
    expect((await bare.get(`${API}/v1/messages/${token}`, { headers: keyA.headers })).status()).toBe(200);

    expect((await bare.delete(`${API}/v1/messages/${token}`, { headers: keyA.headers })).status()).toBe(200);
    expect((await bare.get(`${API}/v1/messages/${token}`, { headers: keyA.headers })).status()).toBe(404);
    await bare.dispose();
  });

  test('keys: each user lists only their own, cannot revoke someone else\'s, and a revoked key dies at once', async ({ request, playwright }) => {
    const { keyA, keyB } = await twoTenants(request);
    const bare = await bareContext(playwright);
    const listB = await (await bare.get(`${API}/v1/api-keys`, { headers: keyB.headers })).json();
    expect(listB.api_keys.map((k) => k.id)).toEqual([keyB.id]);
    expect(JSON.stringify(listB)).not.toContain(keyA.key);
    expect(JSON.stringify(listB)).not.toContain(keyB.key); // never echoes the secret

    expect((await bare.delete(`${API}/v1/api-keys/${keyA.id}`, { headers: keyB.headers })).status()).toBe(404);
    expect((await bare.get(`${API}/v1/stats`, { headers: keyA.headers })).status()).toBe(200); // untouched

    expect((await bare.delete(`${API}/v1/api-keys/${keyA.id}`, { headers: keyA.headers })).status()).toBe(200);
    expect((await bare.get(`${API}/v1/stats`, { headers: keyA.headers })).status()).toBe(401);
    await bare.dispose();
  });

  test('a key cannot write into a team its owner does not belong to (or only views)', async ({ request, playwright }) => {
    const { a, b, keyB } = await twoTenants(request);
    const viewer = await newUser(request); const viewerKey = await newApiKey(request, viewer);
    const { team } = await (await request.post(`${API}/teams`, { headers: a.headers, data: { name: 'Isolation Team' } })).json();
    await request.post(`${API}/teams/${team.id}/members`, { headers: a.headers, data: { email: viewer.email, role: 'viewer' } });
    await request.post(`${API}/teams/${team.id}/members`, { headers: a.headers, data: { email: b.email, role: 'member' } });
    const bare = await bareContext(playwright);
    const create = (headers) => bare.post(`${API}/v1/messages`, { headers, data: body({ teamId: team.id }) });

    const outsider = await newUser(request); const outsiderKey = await newApiKey(request, outsider);
    expect((await create(outsiderKey.headers)).status()).toBe(403);   // not a member
    expect((await create(viewerKey.headers)).status()).toBe(403);     // viewers are read-only
    const ok = await create(keyB.headers);                            // members may
    expect(ok.status(), await ok.text()).toBe(201);
    const listed = await (await bare.get(`${API}/v1/messages?team_id=${team.id}`, { headers: keyB.headers })).json();
    expect(listed.messages.length).toBe(1);
    // and an outsider listing that team's messages sees none of them
    const outsiderView = await (await bare.get(`${API}/v1/messages?team_id=${team.id}`, { headers: outsiderKey.headers })).json();
    expect(outsiderView.messages).toEqual([]);
    await bare.dispose();
  });
});

test.describe('Creating messages through the API', () => {
  test('applies the same validation as the public endpoint', async ({ request, playwright }) => {
    const { keyA } = await twoTenants(request);
    const bare = await bareContext(playwright);
    const post = (data) => bare.post(`${API}/v1/messages`, { headers: keyA.headers, data });

    expect((await post({})).status()).toBe(400);
    expect((await post(body({ iv: 'short' }))).status()).toBe(400);
    expect((await post(body({ salt: 'short' }))).status()).toBe(400);
    expect((await post(body({ encryptedData: { not: 'a string' } }))).status()).toBe(400);
    expect((await post(body({ encryptedData: 'A'.repeat(1.5 * 1024 * 1024) }))).status()).toBe(413);
    for (const expiresInMinutes of [0, -5, 'soon', 60 * 24 * 31]) {
      expect((await post(body({ expiresInMinutes }))).status(), `expiresInMinutes=${expiresInMinutes}`).toBe(400);
    }
    expect((await post(body({ authTag: 'too-short' }))).status()).toBe(400);
    for (const customSlug of ['../etc/passwd', 'x', 'admin']) {
      expect((await post(body({ customSlug }))).status(), `slug=${customSlug}`).toBe(400);
    }
    const slug = `v1-${Date.now().toString().slice(-8)}`;
    expect((await post(body({ customSlug: slug }))).status()).toBe(201);
    expect((await post(body({ customSlug: slug }))).status()).toBe(409);
    // spaces/case are normalised the same way as on the public endpoint (not rejected, not stored raw)
    const spaced = await post(body({ customSlug: `My V1 ${Date.now().toString().slice(-6)}` }));
    expect(spaced.status()).toBe(201);
    expect((await spaced.json()).url).toMatch(/\/m\/my-v1-\d+$/);
    const markup = await post(body({ customSlug: `<b>${Date.now().toString().slice(-9)}</b>` }));
    if (markup.status() === 201) expect((await markup.json()).url).not.toMatch(/[<>"' ]/); // sanitised, never stored raw
    else expect(markup.status()).toBe(400);
    await bare.dispose();
  });

  test('view limits are clamped (999 -> 10) and -1 means unlimited', async ({ request, playwright }) => {
    const { keyA } = await twoTenants(request);
    const bare = await bareContext(playwright);
    const huge = (await (await bare.post(`${API}/v1/messages`, { headers: keyA.headers, data: body({ maxViews: 999 }) })).json()).token;
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await request.get(`${API}/messages/${huge}`)).status());
    expect(statuses.filter((s) => s === 200).length).toBe(10); // not 999
    expect(statuses[10]).toBe(410);

    const unl = (await (await bare.post(`${API}/v1/messages`, { headers: keyA.headers, data: body({ maxViews: -1 }) })).json()).token;
    for (let i = 0; i < 12; i++) expect((await request.get(`${API}/messages/${unl}`)).status()).toBe(200);
    await bare.dispose();
  });

  test('API-created messages can carry a password proof, and use the slug the API reports', async ({ request, playwright }) => {
    const { keyA } = await twoTenants(request);
    const bare = await bareContext(playwright);
    const enc = await encryptMessage('via api', 'api-password-1');
    const authTag = await deriveAuthTag('api-password-1', enc.salt);
    const slug = `proof-${Date.now().toString().slice(-8)}`;
    const created = await bare.post(`${API}/v1/messages`, { headers: keyA.headers, data: { ...enc, authTag, customSlug: slug.toUpperCase() } });
    expect(created.status(), await created.text()).toBe(201);
    const { url, token } = await created.json();
    expect(url.endsWith(`/m/${slug}`)).toBe(true);              // normalised, and the URL matches what is stored

    expect((await request.get(`${API}/messages/${slug}`)).status()).toBe(401);                       // proof required
    const ok = await request.get(`${API}/messages/${slug}`, { headers: { 'X-Auth-Tag': authTag } });
    expect(ok.status()).toBe(200);
    expect(token).toBeTruthy();
    await bare.dispose();
  });

  test('keys are required, and a malformed or empty key is refused', async ({ playwright }) => {
    const bare = await bareContext(playwright);
    const { token } = await (await bare.post(`${API}/app-token`)).json();
    for (const headers of [{}, { 'X-API-Key': '' }, { 'X-API-Key': 'nb_not_a_real_key' }]) {
      // even with a valid anonymous app token, /v1 requires an API key
      const r = await bare.get(`${API}/v1/messages`, { headers: { 'X-App-Token': token, ...headers } });
      expect(r.status(), JSON.stringify(headers)).toBe(401);
    }
    await bare.dispose();
  });
});
