/**
 * Team data: messages created for a team show up in the team's message list, stats,
 * exports and compliance report, and are removed by the GDPR delete. API only.
 */
import { test, expect } from './fixtures.js';
import { API, newUser, newApiKey, bareContext, d1 } from './api-helpers.js';
import { encryptMessage, deriveAuthTag } from '../frontend/src/utils/crypto.js';

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent');
});

async function setup(request) {
  const admin = await newUser(request);
  const member = await newUser(request);
  const outsider = await newUser(request);
  const { team } = await (await request.post(`${API}/teams`, { headers: admin.headers, data: { name: 'Data Team' } })).json();
  expect((await request.post(`${API}/teams/${team.id}/members`, { headers: admin.headers, data: { email: member.email, role: 'member' } })).status()).toBe(201);
  return { admin, member, outsider, teamId: team.id, memberKey: await newApiKey(request, member) };
}

async function teamMessage(bare, key, teamId, password = 'pw-team-1') {
  const enc = await encryptMessage('team secret', password);
  const authTag = await deriveAuthTag(password, enc.salt);
  const res = await bare.post(`${API}/v1/messages`, { headers: key.headers, data: { ...enc, authTag, teamId } });
  expect(res.status(), await res.text()).toBe(201);
  return { ...(await res.json()), authTag };
}

const stats = async (request, u, teamId) => (await (await request.get(`${API}/teams/${teamId}/stats`, { headers: u.headers })).json()).stats;

test.describe('Team messages, stats and exports', () => {
  test('an admin with no messages sees zeros, not an error', async ({ request }) => {
    const { admin, teamId } = await setup(request);
    const res = await request.get(`${API}/teams/${teamId}/stats`, { headers: admin.headers });
    expect(res.status()).toBe(200);
    const s = (await res.json()).stats;
    expect(s).toMatchObject({ total_messages: 0, viewed_messages: 0, burned_messages: 0, active_messages: 0, member_count: 2 });
    expect((await (await request.get(`${API}/teams/${teamId}/messages`, { headers: admin.headers })).json()).messages).toEqual([]);
  });

  test('created, viewed and burned messages are all counted and listed', async ({ request, playwright }) => {
    const { admin, teamId, memberKey } = await setup(request);
    const bare = await bareContext(playwright);
    const kept = await teamMessage(bare, memberKey, teamId);
    const viewed = await teamMessage(bare, memberKey, teamId);
    const burned = await teamMessage(bare, memberKey, teamId);

    let s = await stats(request, admin, teamId);
    expect(s).toMatchObject({ total_messages: 3, active_messages: 3, viewed_messages: 0, burned_messages: 0 });
    const list = await (await request.get(`${API}/teams/${teamId}/messages`, { headers: admin.headers })).json();
    expect(list.pagination.total).toBe(3);
    expect(list.messages).toHaveLength(3);
    expect(JSON.stringify(list)).not.toContain(kept.token); // metadata only, no link secrets

    // a reader opens one, then burns it; another is burned unread
    expect((await request.get(`${API}/messages/${viewed.token}`, { headers: { 'X-Auth-Tag': viewed.authTag } })).status()).toBe(200);
    expect((await request.delete(`${API}/messages/${viewed.token}`, { headers: { 'X-Auth-Tag': viewed.authTag } })).status()).toBe(200);
    expect((await bare.delete(`${API}/v1/messages/${burned.token}`, { headers: memberKey.headers })).status()).toBe(200);

    s = await stats(request, admin, teamId);
    expect(s).toMatchObject({ total_messages: 3, viewed_messages: 1, total_views: 1, burned_messages: 2, active_messages: 1 });
    expect(s.recent_activity).toHaveLength(1);
    expect(s.recent_activity[0]).toMatchObject({ messages_created: 3, messages_viewed: 1, messages_burned: 2 });

    // exports and report include burned messages' history, built from the audit log
    const audit = await (await request.get(`${API}/compliance/${teamId}/export/audit-logs`, { headers: admin.headers })).json();
    const kinds = audit.audit_logs.map((l) => l.event_type);
    expect(kinds.filter((k) => k === 'created')).toHaveLength(3);
    expect(kinds).toContain('burned');
    const msgs = await (await request.get(`${API}/compliance/${teamId}/export/messages`, { headers: admin.headers })).json();
    expect(JSON.stringify(msgs)).not.toContain(kept.token);
    const csv = await (await request.get(`${API}/compliance/${teamId}/export/messages?format=csv`, { headers: admin.headers })).text();
    expect(csv.split('\n')).toHaveLength(2); // header + the one surviving message
    const report = (await (await request.get(`${API}/compliance/${teamId}/report`, { headers: admin.headers })).json()).report;
    expect(report.statistics).toMatchObject({ total_messages: 1, lifetime_created: 3, lifetime_viewed: 1, lifetime_burned: 2 });
    expect(report.statistics.audit_log_entries).toBeGreaterThanOrEqual(4);
  });

  test('only team members can read the list, only admins the stats and exports', async ({ request, playwright }) => {
    const { admin, member, outsider, teamId, memberKey } = await setup(request);
    await teamMessage(await bareContext(playwright), memberKey, teamId);
    expect((await request.get(`${API}/teams/${teamId}/messages`, { headers: member.headers })).status()).toBe(200);
    expect((await request.get(`${API}/teams/${teamId}/messages`, { headers: outsider.headers })).status()).toBe(403);
    for (const path of [`teams/${teamId}/stats`, `compliance/${teamId}/export/messages`, `compliance/${teamId}/export/audit-logs`, `compliance/${teamId}/report`]) {
      expect((await request.get(`${API}/${path}`, { headers: member.headers })).status(), path).toBe(403);
      expect((await request.get(`${API}/${path}`, { headers: outsider.headers })).status(), path).toBe(403);
      expect((await request.get(`${API}/${path}`, { headers: admin.headers })).status(), path).toBe(200);
    }
  });

  test('GDPR delete-all removes the team\'s messages, audit entries and counters', async ({ request, playwright }) => {
    const { admin, teamId, memberKey } = await setup(request);
    await teamMessage(await bareContext(playwright), memberKey, teamId);
    const res = await request.post(`${API}/compliance/${teamId}/gdpr/delete-all`, { headers: admin.headers, data: { confirmation: 'DELETE_ALL_DATA' } });
    expect(res.status(), await res.text()).toBe(200);
    for (const table of ['messages', 'audit_logs', 'team_stats']) {
      const rows = d1(`SELECT COUNT(*) AS n FROM ${table} WHERE team_id='${teamId}'`, { json: true });
      expect(JSON.stringify(rows), table).toMatch(/"n":\s*0/);
    }
  });
});
