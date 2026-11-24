/**
 * The hourly cleanup job (backend/src/scheduled/cleanup.js), run for real through wrangler's
 * /__scheduled endpoint (enabled by `--test-scheduled` in the backend dev script).
 * It deletes data, so it must delete exactly the right rows: API only, Chromium only.
 */
import { test, expect } from './fixtures.js';
import { API, IV, createMessage, newUser, uniq, d1 } from './api-helpers.js';

test.describe.configure({ timeout: 180_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent');
});

const SCHEDULED = 'http://localhost:8787/__scheduled?cron=0+*+*+*+*';
const rows = (sql) => d1(sql, { json: true });
const count = (sql) => Number(Object.values(rows(sql)[0])[0]);
const exists = (token) => count(`SELECT COUNT(*) AS n FROM messages WHERE token = '${token}'`) === 1;

async function runCleanup(request) {
  const res = await request.get(SCHEDULED);
  test.skip(res.status() === 404, 'dev Worker was started without --test-scheduled');
  expect(res.status(), await res.text()).toBe(200);
}

// Each run handles a bounded batch (500 expired messages, 200 legacy tokens) so the job stays inside
// the Worker's time limits; a database with a backlog needs several runs, one per hour in production.
// Run it until `done()` holds (the backlog of old rows left by earlier test runs is cleared on the way).
async function runCleanupUntil(request, done, maxRuns = 40) {
  for (let i = 0; i < maxRuns; i++) {
    await runCleanup(request);
    if (done()) return;
  }
  throw new Error(`cleanup did not reach the expected state after ${maxRuns} runs`);
}

test.describe('Hourly cleanup job', () => {
  test('removes expired and long-burned messages, keeps live and recently burned ones', async ({ request }) => {
    const expired = await createMessage(request);
    const live = await createMessage(request);
    const burnedLongAgo = await createMessage(request);
    const burnedRecently = await createMessage(request);
    const past = Date.now() - 60_000;
    const weekAgo = Date.now() - 8 * 24 * 3600 * 1000;
    d1(`UPDATE messages SET expires_at = ${past} WHERE token = '${expired.token}'`);
    d1(`UPDATE messages SET accessed = 1, created_at = ${weekAgo} WHERE token = '${burnedLongAgo.token}'`);
    d1(`UPDATE messages SET accessed = 1 WHERE token = '${burnedRecently.token}'`);

    await runCleanupUntil(request, () => !exists(expired.token) && !exists(burnedLongAgo.token));

    expect(exists(expired.token), 'expired message').toBe(false);
    expect(exists(burnedLongAgo.token), 'message burned over 7 days ago').toBe(false);
    expect(exists(live.token), 'live message').toBe(true);
    expect(exists(burnedRecently.token), 'message burned within the last 7 days').toBe(true);
    // the live message is still readable through the API afterwards
    expect((await request.get(`${API}/messages/${live.token}`, { headers: { 'X-Auth-Tag': live.authTag } })).status()).toBe(200);
  });

  test('deletes the stored file of a burned message once its grace period is over', async ({ request }) => {
    const m = await createMessage(request);
    const up = await request.post(`${API}/media`, {
      headers: { 'X-Creator-Token': m.creatorToken },
      data: { fileData: Buffer.from('bytes').toString('base64'), fileName: 'a.bin', fileType: 'application/octet-stream', iv: IV, salt: IV, token: m.token },
    });
    expect(up.status()).toBe(201);
    const { fileId } = await up.json();
    expect((await request.delete(`${API}/messages/${m.token}`, { headers: { 'X-Creator-Token': m.creatorToken } })).status()).toBe(200);

    // inside the 24 h grace period the file must survive the job
    await runCleanup(request);
    expect(count(`SELECT COUNT(*) AS n FROM media_cleanup WHERE file_id = '${fileId}'`)).toBe(1);
    expect((await request.get(`${API}/media/${fileId}`)).status()).toBe(200);

    d1(`UPDATE media_cleanup SET delete_after = ${Date.now() - 1000} WHERE file_id = '${fileId}'`);
    await runCleanup(request);
    expect(count(`SELECT COUNT(*) AS n FROM media_cleanup WHERE file_id = '${fileId}'`)).toBe(0);
    expect((await request.get(`${API}/media/${fileId}`)).status(), 'file removed from storage').toBe(404);
  });

  test('prunes old audit logs, expired sessions and used reset tokens; keeps current ones', async ({ request }) => {
    const user = await newUser(request); // has one live session
    const tag = uniq();
    d1(`INSERT INTO audit_logs (message_id, event_type, timestamp) VALUES ('old-${tag}', 'created', datetime('now', '-40 days')), ('new-${tag}', 'created', datetime('now'))`);
    d1(`INSERT INTO sessions (session_token, user_id, expires_at) VALUES ('dead-${tag}', '${user.userId}', '2000-01-01T00:00:00.000Z')`);
    d1(`INSERT INTO password_resets (id, user_id, reset_token, expires_at, used) VALUES ('ru-${tag}', '${user.userId}', 'ru-${tag}', '2999-01-01T00:00:00.000Z', 1), ('rl-${tag}', '${user.userId}', 'rl-${tag}', '2999-01-01T00:00:00.000Z', 0)`);

    await runCleanup(request);

    expect(count(`SELECT COUNT(*) AS n FROM audit_logs WHERE message_id = 'old-${tag}'`), 'old audit entry').toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM audit_logs WHERE message_id = 'new-${tag}'`), 'recent audit entry').toBe(1);
    expect(count(`SELECT COUNT(*) AS n FROM sessions WHERE session_token = 'dead-${tag}'`), 'expired session').toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM password_resets WHERE id = 'ru-${tag}'`), 'used reset token').toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM password_resets WHERE id = 'rl-${tag}'`), 'unused, unexpired reset token').toBe(1);
    // the user's real session is untouched
    expect((await request.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(200);
  });

  test('upgrades a legacy plaintext creator token to a hash that still works', async ({ request }) => {
    const m = await createMessage(request);
    d1(`UPDATE messages SET creator_token = '${m.creatorToken}' WHERE token = '${m.token}'`); // legacy plaintext row
    await runCleanupUntil(request, () => /^[0-9a-f]{64}$/.test(rows(`SELECT creator_token FROM messages WHERE token = '${m.token}'`)[0].creator_token));
    const [{ creator_token }] = rows(`SELECT creator_token FROM messages WHERE token = '${m.token}'`);
    expect(creator_token).toMatch(/^[0-9a-f]{64}$/);
    expect(creator_token).not.toBe(m.creatorToken);
    expect((await request.delete(`${API}/messages/${m.token}`, { headers: { 'X-Creator-Token': m.creatorToken } })).status()).toBe(200);
  });

  test('is safe to run twice in a row', async ({ request }) => {
    const live = await createMessage(request);
    await runCleanup(request);
    await runCleanup(request);
    expect(exists(live.token)).toBe(true);
  });
});
