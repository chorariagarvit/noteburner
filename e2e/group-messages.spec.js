/**
 * Group (1-to-many) messages through the API: one link per recipient, independent opening,
 * shared burning rules, input limits and cleanup. API only, Chromium only.
 */
import { test, expect } from './fixtures.js';
import { API, IV, d1, randomIp, runCleanupUntil } from './api-helpers.js';

test.describe.configure({ timeout: 180_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent');
});

const rows = (sql) => d1(sql, { json: true });
const n = (sql) => Number(Object.values(rows(sql)[0])[0]);

// The group endpoint is limited to 5 requests/minute per client IP; each call here uses its own IP
const createGroup = (request, extra = {}) =>
  request.post(`${API}/messages/group`, { headers: { 'CF-Connecting-IP': randomIp() }, data: { encryptedData: 'group-cipher-text', iv: IV, salt: IV, ...extra } });
const open = (request, token) => request.get(`${API}/messages/${token}`, { headers: { 'CF-Connecting-IP': randomIp() } });
const burn = (request, token) => request.delete(`${API}/messages/${token}`, { headers: { 'CF-Connecting-IP': randomIp() } });

async function group(request, extra) {
  const res = await createGroup(request, extra);
  expect(res.status(), await res.text()).toBe(201);
  return res.json();
}

test.describe('Group messages', () => {
  test('creates one distinct link per recipient, each opening once and independently', async ({ request }) => {
    const g = await group(request, { recipientCount: 3, expiresIn: 3600 });
    expect(g).toMatchObject({ success: true, recipientCount: 3, burnOnFirstView: false });
    expect(g.links).toHaveLength(3);
    expect(new Set(g.links.map((l) => l.token)).size).toBe(3);
    expect(g.links.map((l) => l.recipientIndex)).toEqual([1, 2, 3]);
    expect(g.links[0].url).toMatch(/\/m\/[\w-]{32}$/);
    expect(g.expiresAt).toBeGreaterThan(Date.now());

    const first = await open(request, g.links[0].token);
    expect(first.status()).toBe(200);
    expect((await first.json()).encryptedData).toBe('group-cipher-text');
    // the same link cannot be opened twice...
    expect((await open(request, g.links[0].token)).status()).toBe(410);
    // ...but opening one link never uses up another recipient's link
    expect((await open(request, g.links[1].token)).status()).toBe(200);
    expect((await open(request, g.links[2].token)).status()).toBe(200);
  });

  test('by default burning one link leaves the others untouched', async ({ request }) => {
    const g = await group(request, { recipientCount: 3 });
    expect((await burn(request, g.links[0].token)).status()).toBe(200);
    expect((await open(request, g.links[0].token)).status()).toBe(404);
    expect((await open(request, g.links[1].token)).status()).toBe(200);
    expect(n(`SELECT COUNT(*) AS n FROM messages WHERE group_id = '${g.groupId}'`)).toBe(2);
  });

  test('burnOnFirstView: the first burn destroys every link and the group record', async ({ request }) => {
    const g = await group(request, { recipientCount: 4, burnOnFirstView: true });
    const res = await burn(request, g.links[2].token);
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ groupBurned: true, groupId: g.groupId });
    for (const l of g.links) expect((await open(request, l.token)).status(), `link ${l.recipientIndex}`).toBe(404);
    expect(n(`SELECT COUNT(*) AS n FROM messages WHERE group_id = '${g.groupId}'`)).toBe(0);
    expect(n(`SELECT COUNT(*) AS n FROM message_groups WHERE group_id = '${g.groupId}'`)).toBe(0);
  });

  test('maxViews: the group burns once that many links have been burned, not before', async ({ request }) => {
    const g = await group(request, { recipientCount: 4, maxViews: 2 });
    expect((await burn(request, g.links[0].token)).status()).toBe(200);
    expect((await open(request, g.links[1].token)).status(), 'one burn so far').toBe(200);
    const second = await burn(request, g.links[1].token);
    expect(await second.json()).toMatchObject({ groupBurned: true });
    for (const l of g.links.slice(2)) expect((await open(request, l.token)).status()).toBe(404);
  });

  test('a burned link cannot be burned again, and counts only once', async ({ request }) => {
    const g = await group(request, { recipientCount: 3, maxViews: 2 });
    expect((await burn(request, g.links[0].token)).status()).toBe(200);
    expect((await burn(request, g.links[0].token)).status()).toBe(404);
    expect(n(`SELECT accessed_count AS n FROM message_groups WHERE group_id = '${g.groupId}'`)).toBe(1);
    expect((await open(request, g.links[2].token)).status(), 'group still alive after one burn counted once').toBe(200);
  });

  test('up to 100 recipients are supported', async ({ request }) => {
    const g = await group(request, { recipientCount: 100 });
    expect(g.links).toHaveLength(100);
    expect(new Set(g.links.map((l) => l.token)).size).toBe(100);
    expect(n(`SELECT COUNT(*) AS n FROM messages WHERE group_id = '${g.groupId}'`)).toBe(100);
  });

  test('rejects bad recipient counts, options, ciphertext and expiry', async ({ request }) => {
    const bad = [
      [{ recipientCount: 0 }, 'zero recipients'], [{ recipientCount: 101 }, 'too many'], [{ recipientCount: -3 }, 'negative'],
      [{ recipientCount: 2.5 }, 'fraction'], [{ recipientCount: '3' }, 'string'], [{ recipientCount: null }, 'null (would make an empty group)'],
      [{ maxViews: 0 }, 'maxViews 0'], [{ maxViews: 'x' }, 'maxViews text'], [{ maxViews: 101 }, 'maxViews 101'],
      [{ iv: 'short' }, 'bad iv'], [{ salt: 'x'.repeat(40) }, 'bad salt'], [{ encryptedData: '' }, 'empty ciphertext'], [{ encryptedData: 42 }, 'non-text ciphertext'],
      [{ expiresIn: -60 }, 'negative expiry'], [{ expiresIn: 0 }, 'zero expiry'], [{ expiresIn: 31 * 24 * 3600 }, 'expiry over 30 days'], [{ expiresIn: 'soon' }, 'text expiry'],
    ];
    for (const [extra, label] of bad) {
      expect((await createGroup(request, extra)).status(), label).toBe(400);
    }
    expect(n(`SELECT COUNT(*) AS n FROM messages WHERE group_id IS NOT NULL AND encrypted_data = 'group-cipher-text' AND created_at > ${Date.now() - 60_000} AND expires_at < ${Date.now()}`)).toBe(0);
  });

  test('oversized ciphertext is refused before it is copied once per recipient', async ({ request }) => {
    const res = await createGroup(request, { recipientCount: 100, encryptedData: 'A'.repeat(2 * 1024 * 1024) });
    expect([400, 413]).toContain(res.status());
    expect((await createGroup(request, { recipientCount: 2, encryptedData: 'A'.repeat(1024 * 1024) })).status(), 'within the limit').toBe(201);
  });

  test('expired groups are removed by the cleanup job, links and record both', async ({ request }) => {
    const g = await group(request, { recipientCount: 2, expiresIn: 3600 });
    const past = Date.now() - 1000;
    d1(`UPDATE message_groups SET expires_at = ${past} WHERE group_id = '${g.groupId}'`);
    d1(`UPDATE messages SET expires_at = ${past} WHERE group_id = '${g.groupId}'`);
    await runCleanupUntil(request, () => n(`SELECT COUNT(*) AS n FROM messages WHERE group_id = '${g.groupId}'`) === 0);
    await runCleanupUntil(request, () => n(`SELECT COUNT(*) AS n FROM message_groups WHERE group_id = '${g.groupId}'`) === 0, 5);
    expect((await open(request, g.links[0].token)).status()).toBe(404);
  });
});
