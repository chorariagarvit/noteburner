/**
 * Team branding and compliance: permissions, input validation (incl. XSS payloads), CSV exports,
 * and that the stored retention / password settings are actually enforced.
 */
import { test, expect } from './fixtures.js';
import { API, IV, newUser, newApiKey, bareContext, d1, uniq, runCleanupUntil, parseCsv } from './api-helpers.js';
import { encryptMessage, deriveAuthTag } from '../frontend/src/utils/crypto.js';

test.describe.configure({ timeout: 180_000 });

const XSS = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';

async function setup(request, plan = 'team') {
  const admin = await newUser(request);
  const member = await newUser(request);
  const outsider = await newUser(request);
  const { team } = await (await request.post(`${API}/teams`, { headers: admin.headers, data: { name: 'Brand Team' } })).json();
  expect((await request.post(`${API}/teams/${team.id}/members`, { headers: admin.headers, data: { email: member.email, role: 'member' } })).status()).toBe(201);
  d1(`UPDATE teams SET plan = '${plan}', max_members = 100 WHERE id = '${team.id}'`);
  return { admin, member, outsider, teamId: team.id };
}

/** A second team with the same admin and member (signups are rate limited, so don't register more users). */
async function secondTeam(request, { admin, member }) {
  const { team } = await (await request.post(`${API}/teams`, { headers: admin.headers, data: { name: 'Second Team' } })).json();
  expect((await request.post(`${API}/teams/${team.id}/members`, { headers: admin.headers, data: { email: member.email, role: 'member' } })).status()).toBe(201);
  d1(`UPDATE teams SET plan = 'team', max_members = 100 WHERE id = '${team.id}'`);
  return { admin, member, teamId: team.id };
}

const putBranding = (request, u, teamId, data) => request.put(`${API}/branding/${teamId}`, { headers: u.headers, data });
const getBranding = async (request, teamId) => (await (await request.get(`${API}/branding/${teamId}`)).json()).branding;

test.describe('Branding API', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent'); });

  test('unconfigured teams get defaults; only admins can change anything', async ({ request }) => {
    const { admin, member, outsider, teamId } = await setup(request);
    expect(await getBranding(request, teamId)).toMatchObject({ primary_color: '#f59e0b', white_label: false, logo_url: null });
    for (const [who, u] of [['member', member], ['outsider', outsider]]) {
      expect((await putBranding(request, u, teamId, { primary_color: '#112233' })).status(), who).toBe(403);
    }
    expect((await request.put(`${API}/branding/${teamId}`, { data: { primary_color: '#112233' } })).status(), 'no session').toBe(401);
    expect((await putBranding(request, admin, teamId, { primary_color: '#112233' })).status()).toBe(200);
    expect((await getBranding(request, teamId)).primary_color).toBe('#112233');
  });

  test('free plans cannot use custom branding', async ({ request }) => {
    const { admin, teamId } = await setup(request, 'free');
    const res = await putBranding(request, admin, teamId, { primary_color: '#112233' });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('UPGRADE_REQUIRED');
  });

  test('rejects malformed colours, bodies and field types', async ({ request }) => {
    const { admin, teamId } = await setup(request);
    for (const bad of ['red', '#12', '#GGGGGG', 'javascript:alert(1)', '#112233;background:url(x)', 123, ['#112233']]) {
      expect((await putBranding(request, admin, teamId, { primary_color: bad })).status(), JSON.stringify(bad)).toBe(400);
    }
    const notJson = await request.put(`${API}/branding/${teamId}`, { headers: { ...admin.headers, 'Content-Type': 'application/json' }, data: '{not json' });
    expect(notJson.status(), 'invalid JSON must be a client error, not a 500').toBe(400);
  });

  test('logo and favicon must be plain https URLs: no script, data or credential URLs', async ({ request }) => {
    const { admin, teamId } = await setup(request);
    const bad = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'data:image/svg+xml;base64,PHN2Zz4=',
      'http://insecure.example/logo.png', 'https://user:pass@example.com/logo.png', 'ftp://example.com/x.png', '//example.com/x.png',
      'https://example.com/' + 'a'.repeat(2100), 'not a url', 42];
    for (const field of ['logo_url', 'custom_favicon']) {
      for (const value of bad) {
        expect((await putBranding(request, admin, teamId, { [field]: value })).status(), `${field}=${String(value).slice(0, 40)}`).toBe(400);
      }
    }
    expect((await getBranding(request, teamId)).logo_url, 'nothing bad was stored').toBeNull();
    const ok = await putBranding(request, admin, teamId, { logo_url: 'https://cdn.example.com/logo.png', custom_favicon: 'https://cdn.example.com/f.ico' });
    expect(ok.status(), await ok.text()).toBe(200);
    expect(await getBranding(request, teamId)).toMatchObject({ logo_url: 'https://cdn.example.com/logo.png', custom_favicon: 'https://cdn.example.com/f.ico' });
  });

  test('the footer is stored as inert text, served as JSON, and length limited', async ({ request }) => {
    const { admin, teamId } = await setup(request);
    expect((await putBranding(request, admin, teamId, { custom_footer: XSS })).status()).toBe(200);
    const res = await request.get(`${API}/branding/${teamId}`);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect((await res.json()).branding.custom_footer).toBe(XSS);
    expect((await putBranding(request, admin, teamId, { custom_footer: 'x'.repeat(501) })).status()).toBe(400);
    expect((await putBranding(request, admin, teamId, { custom_footer: { html: XSS } })).status()).toBe(400);
  });

  test('white label is Enterprise-only, on first save as well as on update', async ({ request }) => {
    const { admin, teamId } = await setup(request, 'team');
    expect((await putBranding(request, admin, teamId, { white_label: true })).status(), 'first save').toBe(403);
    expect((await putBranding(request, admin, teamId, { primary_color: '#112233' })).status()).toBe(200);
    expect((await putBranding(request, admin, teamId, { white_label: true })).status(), 'update').toBe(403);
    expect((await getBranding(request, teamId)).white_label).toBe(false);
    d1(`UPDATE teams SET plan = 'enterprise' WHERE id = '${teamId}'`);
    expect((await putBranding(request, admin, teamId, { white_label: true })).status()).toBe(200);
    expect((await getBranding(request, teamId)).white_label).toBe(true);
  });

  test('the CSS preview exposes only colours, never markup', async ({ request }) => {
    const { admin, teamId } = await setup(request);
    await putBranding(request, admin, teamId, { primary_color: '#abcdef', secondary_color: '#123456', custom_footer: XSS });
    const preview = await (await request.get(`${API}/branding/preview/${teamId}`)).json();
    expect(preview.css).toEqual({ '--color-primary': '#abcdef', '--color-secondary': '#123456' });
    expect(JSON.stringify(preview)).not.toContain('<');
  });
});

test.describe('Branding page (UI)', () => {
  test('a malicious footer is shown as text and never runs', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'covered once; rendering is the same in every engine');
    const { admin, teamId } = await setup(request);
    // stored directly: even if validation were bypassed, the page must not execute it
    d1(`INSERT INTO branding_config (id, team_id, custom_footer) VALUES ('b-${uniq()}', '${teamId}', '<img src=x onerror=window.__xss=1>')`);
    await page.addInitScript((t) => { sessionStorage.setItem('sessionToken', t); localStorage.setItem('noteburner_onboarding_complete', 'true'); }, admin.token);
    await page.goto(`/teams/${teamId}/branding`);
    await expect(page.getByText('<img src=x onerror=window.__xss=1>').first()).toBeVisible({ timeout: 20000 });
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });
});

test.describe('Compliance API', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent'); });

  test('settings: defaults, update, persistence and permissions', async ({ request }) => {
    const { admin, member, outsider, teamId } = await setup(request);
    const get = (u) => request.get(`${API}/compliance/${teamId}/settings`, { headers: u.headers });
    expect((await (await get(admin)).json()).settings).toMatchObject({ data_retention_days: 30, gdpr_enabled: true, auto_delete_enabled: true });
    expect((await get(member)).status()).toBe(403);
    expect((await get(outsider)).status()).toBe(403);
    const put = (u, data) => request.put(`${API}/compliance/${teamId}/settings`, { headers: u.headers, data });
    expect((await put(member, { data_retention_days: 5 })).status()).toBe(403);
    expect((await put(admin, { data_retention_days: 7, auto_delete_enabled: false, require_password: true, min_password_strength: 3 })).status()).toBe(200);
    expect((await (await get(admin)).json()).settings).toMatchObject({ data_retention_days: 7, auto_delete_enabled: false, require_password: true, min_password_strength: 3 });
    expect((await put(admin, {})).status(), 'empty update').toBe(400);
  });

  test('settings: out-of-range, non-integer and malformed values are rejected', async ({ request }) => {
    const { admin, teamId } = await setup(request);
    const put = (data) => request.put(`${API}/compliance/${teamId}/settings`, { headers: admin.headers, data });
    for (const data of [{ data_retention_days: 0 }, { data_retention_days: 3651 }, { data_retention_days: 'abc' }, { data_retention_days: 1.5 }, { data_retention_days: null },
      { audit_log_retention: -5 }, { audit_log_retention: 0 }, { audit_log_retention: 31 }, { audit_log_retention: 'x' }, { min_password_strength: 9 }, { min_password_strength: 'strong' }]) {
      expect((await put(data)).status(), JSON.stringify(data)).toBe(400);
    }
    const notJson = await request.put(`${API}/compliance/${teamId}/settings`, { headers: { ...admin.headers, 'Content-Type': 'application/json' }, data: '{bad' });
    expect(notJson.status()).toBe(400);
  });

  test('audit-log CSV export is valid CSV: metadata with commas and quotes stays in one column', async ({ request, playwright }) => {
    const { admin, member, teamId } = await setup(request);
    const key = await newApiKey(request, member);
    const bare = await bareContext(playwright);
    const enc = await encryptMessage('x', 'pw-compliance-1');
    expect((await bare.post(`${API}/v1/messages`, { headers: key.headers, data: { ...enc, teamId } })).status()).toBe(201);
    // '#' stands for a double quote (the d1 helper refuses real ones); the country is a spreadsheet-formula lookalike
    d1(`INSERT INTO audit_logs (message_id, event_type, country, metadata, team_id) VALUES ('m-${uniq()}', 'created', '=1+1', replace('{#note#:#a, b#, #c#}', '#', char(34)), '${teamId}')`);
    const res = await request.get(`${API}/compliance/${teamId}/export/audit-logs?format=csv`, { headers: admin.headers });
    expect(res.headers()['content-type']).toContain('text/csv');
    const rows = parseCsv(await res.text());
    expect(rows[0]).toEqual(['ID', 'Message ID', 'Event Type', 'Country', 'Timestamp', 'Success', 'Metadata']);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const r of rows) expect(r, JSON.stringify(r)).toHaveLength(7);
    const row = rows.find((r) => r[6].includes('a, b'));
    expect(row[6], 'commas and quotes survive').toBe('{"note":"a, b", "c"}');
    expect(row[3], 'a formula lookalike is neutralised').toBe("'=1+1");
  });

  test('message export lists metadata only: no ciphertext, no tokens', async ({ request, playwright }) => {
    const { admin, member, teamId } = await setup(request);
    const key = await newApiKey(request, member);
    const enc = await encryptMessage('secret-body', 'pw-compliance-2');
    const created = await (await (await bareContext(playwright)).post(`${API}/v1/messages`, { headers: key.headers, data: { ...enc, teamId } })).json();
    const text = await (await request.get(`${API}/compliance/${teamId}/export/messages`, { headers: admin.headers })).text();
    expect(text).not.toContain(created.token);
    expect(text).not.toContain(enc.encryptedData);
    const csv = await (await request.get(`${API}/compliance/${teamId}/export/messages?format=csv`, { headers: admin.headers })).text();
    for (const r of parseCsv(csv)) expect(r).toHaveLength(parseCsv(csv)[0].length);
  });

  test('data retention is enforced by the cleanup job (per team, only when auto-delete is on)', async ({ request, playwright }) => {
    const on = await setup(request); const off = await secondTeam(request, on);
    for (const [t, auto] of [[on, 1], [off, 0]]) {
      d1(`UPDATE compliance_settings SET data_retention_days = 1, auto_delete_enabled = ${auto} WHERE team_id = '${t.teamId}'`);
    }
    const bare = await bareContext(playwright);
    const make = async (t, ageDays) => {
      const key = await newApiKey(request, t.member);
      const enc = await encryptMessage('x', 'pw-retention-1');
      const m = await (await bare.post(`${API}/v1/messages`, { headers: key.headers, data: { ...enc, teamId: t.teamId, expiresInMinutes: 1 } })).json();
      d1(`UPDATE messages SET expires_at = NULL, created_at = ${Date.now() - ageDays * 24 * 3600 * 1000} WHERE token = '${m.token}'`);
      return m.token;
    };
    const old = await make(on, 3); const fresh = await make(on, 0); const oldButKept = await make(off, 3);
    const has = (tok) => Number(Object.values(d1(`SELECT COUNT(*) AS n FROM messages WHERE token = '${tok}'`, { json: true })[0])[0]) === 1;
    await runCleanupUntil(request, () => !has(old));
    expect(has(old), 'older than the retention period').toBe(false);
    expect(has(fresh), 'within the retention period').toBe(true);
    expect(has(oldButKept), 'auto-delete is off for this team').toBe(true);
  });

  test('"require password" is enforced for messages created through the API', async ({ request, playwright }) => {
    const { admin, member, teamId } = await setup(request);
    expect((await request.put(`${API}/compliance/${teamId}/settings`, { headers: admin.headers, data: { require_password: true } })).status()).toBe(200);
    const key = await newApiKey(request, member);
    const bare = await bareContext(playwright);
    const enc = await encryptMessage('x', 'pw-required-1');
    const without = await bare.post(`${API}/v1/messages`, { headers: key.headers, data: { ...enc, teamId } });
    expect(without.status()).toBe(400);
    expect((await without.json()).code).toBe('PASSWORD_REQUIRED');
    const authTag = await deriveAuthTag('pw-required-1', enc.salt);
    expect((await bare.post(`${API}/v1/messages`, { headers: key.headers, data: { ...enc, teamId, authTag } })).status()).toBe(201);
    // messages outside the team are unaffected
    expect((await bare.post(`${API}/v1/messages`, { headers: key.headers, data: { ...enc } })).status()).toBe(201);
  });

  test('GDPR delete-all: owner only, needs the exact confirmation, removes the team', async ({ request }) => {
    const { admin, member, teamId } = await setup(request);
    const post = (u, data) => request.post(`${API}/compliance/${teamId}/gdpr/delete-all`, { headers: u.headers, data });
    expect((await post(member, { confirmation: 'DELETE_ALL_DATA' })).status()).toBe(403);
    for (const confirmation of [undefined, '', 'delete_all_data', 'yes']) {
      expect((await post(admin, { confirmation })).status(), String(confirmation)).toBe(400);
    }
    expect((await request.get(`${API}/teams/${teamId}`, { headers: admin.headers })).status(), 'still exists').toBe(200);
    const done = await post(admin, { confirmation: 'DELETE_ALL_DATA' });
    expect(done.status(), await done.text()).toBe(200);
    expect((await request.get(`${API}/teams/${teamId}`, { headers: admin.headers })).status()).toBeGreaterThanOrEqual(403);
    expect(Number(Object.values(d1(`SELECT COUNT(*) AS n FROM compliance_settings WHERE team_id = '${teamId}'`, { json: true })[0])[0])).toBe(0);
  });
});
