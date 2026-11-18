/**
 * Per-team daily counters (team_stats). Messages are deleted when burned, so the
 * counts have to be kept as we go instead of derived from the messages table.
 */
const FIELDS = new Set(['messages_created', 'messages_viewed', 'messages_burned']);

export async function bumpTeamStat(db, teamId, field) {
  if (!teamId || !FIELDS.has(field)) return;
  const today = new Date().toISOString().split('T')[0];
  try {
    await db.prepare(
      `INSERT INTO team_stats (team_id, date, ${field}) VALUES (?, ?, 1)
       ON CONFLICT(team_id, date) DO UPDATE SET ${field} = ${field} + 1`
    ).bind(String(teamId), today).run();
  } catch (err) {
    console.warn('[teamStats] failed:', err.message); // never fail a request over a counter
  }
}
