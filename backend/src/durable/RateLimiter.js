/**
 * Durable Object: one instance per rate-limit key (e.g. "rl:ip:1.2.3.4:10:60").
 *
 * A Durable Object processes requests one at a time and its storage calls are covered by input
 * gates, so the read-modify-write below is genuinely atomic. (The previous KV counters were
 * eventually consistent: a burst of parallel requests could all read the same count and slip past
 * the limit.) The counter wipes itself shortly after its window ends so idle keys cost nothing.
 */
export class RateLimiter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
    const limit = Number(body.limit);
    const windowSeconds = Number(body.windowSeconds);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1_000_000 ||
        !Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86_400) {
      return json({ error: 'bad parameters' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    let record = await this.state.storage.get('window');
    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + windowSeconds };
    }

    if (record.count >= limit) {
      return json({ allowed: false, count: record.count, resetAt: record.resetAt });
    }

    record.count += 1;
    await this.state.storage.put('window', record);
    // Clean up after the window (an alarm per object; setting it again just moves it)
    await this.state.storage.setAlarm((record.resetAt + 5) * 1000);
    return json({ allowed: true, count: record.count, resetAt: record.resetAt });
  }

  async alarm() {
    const record = await this.state.storage.get('window');
    if (!record || record.resetAt <= Math.floor(Date.now() / 1000)) {
      await this.state.storage.deleteAll();
    }
  }
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
