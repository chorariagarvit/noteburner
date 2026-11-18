import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailTemplates } from '../src/utils/emailTemplates.js';

const evil = '<img src=x onerror=alert(1)><a href="https://evil.example">verify</a>"\'&';

const html = (r) => (typeof r === 'string' ? r : r.html ?? JSON.stringify(r));

test('verification email escapes a hostile display name', () => {
  const out = html(emailTemplates.verification({ displayName: evil, verificationUrl: 'https://noteburner.work/verify-email?token=abc', expiresIn: '24 hours' }));
  assert.ok(!out.includes('<img src=x'), 'raw <img> leaked');
  assert.ok(!out.includes('<a href="https://evil.example">'), 'raw attacker link leaked');
  assert.ok(out.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('reset email escapes the name and the URL (attribute injection)', () => {
  const out = html(emailTemplates.passwordReset({ displayName: evil, resetUrl: 'https://x.example/?a="><script>alert(1)</script>', expiresIn: '1 hour' }));
  assert.ok(!out.includes('<script>alert(1)</script>'));
  assert.ok(!out.includes('"><script>'));
});

test('team invitation escapes team name, inviter and role', () => {
  const out = html(emailTemplates.teamInvitation({ teamName: evil, inviterName: evil, role: '<b>admin</b>', loginUrl: 'https://noteburner.work/login' }));
  assert.ok(!out.includes('<b>admin</b>'));
  assert.ok(!out.includes('<img src=x'));
});

test('welcome email escapes the name', () => {
  const out = html(emailTemplates.welcome({ displayName: evil, baseUrl: 'https://noteburner.work' }));
  assert.ok(!out.includes('<img src=x'));
});

test('benign values are preserved', () => {
  const out = html(emailTemplates.verification({ displayName: 'Ada Lovelace', verificationUrl: 'https://noteburner.work/verify-email?token=abc123', expiresIn: '24 hours' }));
  assert.ok(out.includes('Ada Lovelace'));
  assert.ok(out.includes('token=abc123'));
});
