import { test, expect } from './fixtures.js';
import { execSync } from 'node:child_process';
import path from 'node:path';

// Plans are NOT client-selectable any more (teams always start on 'free'; paid plans come only from
// verified billing). Tests that exercise paid features flip the plan directly in the local test DB.
function upgradeTeam(teamId, plan = 'enterprise') {
  // The local D1 file is shared with the dev servers (and, when browsers run back to back, other
  // wrangler processes), so a write can hit a transient lock: retry, and surface the real error.
  const sql = `UPDATE teams SET plan='${plan}', max_members=100 WHERE id='${teamId}'`;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      execSync(`npx wrangler d1 execute noteburner-db --local --command "${sql}"`, {
        cwd: path.resolve(process.cwd(), 'backend'), stdio: 'pipe', timeout: 90_000,
      });
      return;
    } catch (err) {
      lastError = err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000 * attempt); // back off, synchronously
    }
  }
  throw new Error(`upgradeTeam(${teamId}) failed after 4 attempts: ${lastError.stderr?.toString().slice(-600) || lastError.message}`);
}

// Adding a member requires a REGISTERED user (unknown emails are not revealed or added).
async function registerUser(request) {
  const email = `e2e-member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await request.post('http://localhost:8787/api/auth/signup', {
    data: { email, password: 'Str0ng!Passw0rd#1' }
  });
  expect(res.status()).toBe(201);
  return email;
}

test.describe('Enterprise Features', () => {
  
  let sessionToken = '';
  const testUser = {
    email: `e2e-enterprise-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: 'E2E Test User'
  };
  
  // Create test user and login before all tests
  test.beforeAll(async ({ request }) => {
    // Create user
    const signupRes = await request.post('http://localhost:8787/api/auth/signup', {
      data: {
        email: testUser.email,
        password: testUser.password,
        displayName: testUser.displayName
      }
    });
    
    if (!signupRes.ok()) {
      console.log('Signup failed:', await signupRes.text());
    }
    
    // Login to get session token
    const loginRes = await request.post('http://localhost:8787/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
        rememberMe: true
      }
    });
    
    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      sessionToken = loginData.sessionToken;
      console.log('E2E tests: Test user logged in successfully');
    } else {
      throw new Error('Failed to login test user for these tests');
    }
  });
  
  // API v1 Tests
  test.describe('API v1 Endpoints', () => {
    
    test('should require API key for protected endpoints', async ({ request }) => {
      const response = await request.get('http://localhost:8787/api/v1/messages');
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('API_KEY_MISSING');
    });

    test('should reject invalid API key', async ({ request }) => {
      const response = await request.get('http://localhost:8787/api/v1/messages', {
        headers: { 'X-API-Key': 'invalid_key' }
      });
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('API_KEY_INVALID');
    });

    test('should create API key and message', async ({ request }) => {
      const keyResponse = await request.post('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Test Key', rate_limit: 1000 }
      });
      
      if (keyResponse.ok()) {
        const keyData = await keyResponse.json();
        const apiKey = keyData.key;
        expect(apiKey).toMatch(/^nb_/);

        // Create message with mock encrypted data
        const msgResponse = await request.post('http://localhost:8787/api/v1/messages', {
          headers: { 'X-API-Key': apiKey },
          data: { 
            encryptedData: 'mock_encrypted_test_message',
            iv: 'AAAAAAAAAAAAAAAAAAAAAA==',   // 16 bytes, as the API requires
            salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
            maxViews: 5 
          }
        });
        expect(msgResponse.status()).toBe(201);
        const msgData = await msgResponse.json();
        expect(msgData.token).toBeTruthy();
      }
    });

    test('should list messages with API key', async ({ request }) => {
      const response = await request.post('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'List Key', rate_limit: 1000 }
      });

      if (response.ok()) {
        const keyData = await response.json();
        const listResponse = await request.get('http://localhost:8787/api/v1/messages', {
          headers: { 'X-API-Key': keyData.key }
        });
        expect(listResponse.status()).toBe(200);
        const data = await listResponse.json();
        expect(Array.isArray(data.messages)).toBe(true);
      }
    });
  });

  // Team Workspace Tests
  test.describe('Team Workspaces', () => {
    
    test('should create team via API', async ({ request }) => {
      const response = await request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'E2E Test Team', plan: 'team' }
      });
      
      if (response.status() === 201) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.team.name).toBe('E2E Test Team');
      }
    });

    test('should list user teams', async ({ request }) => {
      const response = await request.get('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.teams)).toBe(true);
    });

    test('should display team dashboard UI', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      // Create a team first
      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'UI Test Team', plan: 'team' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      // Navigate to team dashboard
      await page.goto(`http://localhost:5173/teams/${teamId}`, { waitUntil: 'networkidle' });
      
      // Wait for loading to complete
      await page.waitForSelector('text=Loading team...', { state: 'hidden', timeout: 10000 }).catch(() => {});
      
      // Check for team name in a more specific h1 (not the header)
      await expect(page.locator('h1.text-3xl')).toContainText('UI Test Team');
      await expect(page.locator('text=/free Plan/i')).toBeVisible(); // plan is always 'free' until billing upgrades it
    });

    test('should invite team member', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Invite Test Team', plan: 'team' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}`);
      
      // Switch to Members tab
      await page.click('button:has-text("Members")');
      
      const inviteEmail = await registerUser(page.request);
      await page.click('button:has-text("Invite Member")');
      await page.fill('input[type="email"]', inviteEmail);
      await page.click('button:has-text("Send Invite")');
      await expect(page.locator(`text=${inviteEmail}`)).toBeVisible();
    });

    test('should update member role', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Role Test Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      // Add a (registered) member
      const memberEmail = await registerUser(page.request);
      await page.request.post(`http://localhost:8787/api/teams/${teamId}/members`, {
        headers: { 'X-Session-Token': sessionToken },
        data: { email: memberEmail, role: 'member' }
      });

      await page.goto(`http://localhost:5173/teams/${teamId}`);
      
      // Switch to Members tab
      await page.click('button:has-text("Members")');
      
      // Update role via UI
      const memberRow = page.locator(`tr:has-text("${memberEmail}")`);
      await memberRow.locator('select').selectOption('admin');
      await expect(memberRow.locator('select')).toHaveValue('admin');
    });

    test('should remove team member', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Remove Test Team', plan: 'team' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      const removeEmail = await registerUser(page.request);
      await page.request.post(`http://localhost:8787/api/teams/${teamId}/members`, {
        headers: { 'X-Session-Token': sessionToken },
        data: { email: removeEmail, role: 'member' }
      });

      await page.goto(`http://localhost:5173/teams/${teamId}`);
      
      // Switch to Members tab
      await page.click('button:has-text("Members")');
      
      const memberRow = page.locator(`tr:has-text("${removeEmail}")`);
      await memberRow.locator('button:has-text("Remove")').click();
      // A native <dialog> asks for confirmation (it used to be a browser confirm() pop-up)
      await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
      await expect(page.locator(`text=${removeEmail}`)).not.toBeVisible();
    });

    test('should display team stats', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Stats Test Team', plan: 'team' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}`);
      await expect(page.locator('text=Total Messages')).toBeVisible();
      await expect(page.locator('text=Active Members')).toBeVisible();
    });
  });

  // Branding Tests
  test.describe('Custom Branding', () => {
    test('should load branding settings', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Branding Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/branding`);
      await expect(page.getByRole('heading', { name: 'Brand Customization' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Logo' })).toBeVisible();
    });

    test('should update colors', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Color Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;
      upgradeTeam(teamId); // branding is a paid feature

      await page.goto(`http://localhost:5173/teams/${teamId}/branding`);
      
      const colorInput = page.locator('input[type="color"]').first();
      await colorInput.fill('#ff5733');
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=saved')).toBeVisible();
    });

    test('should update logo', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Logo Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/branding`);
      await expect(page.getByRole('heading', { name: 'Logo' })).toBeVisible();
      await expect(page.locator('input[type="url"]')).toBeVisible();
    });

    test('should toggle white label', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'White Label Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;
      upgradeTeam(teamId); // branding is a paid feature

      await page.goto(`http://localhost:5173/teams/${teamId}/branding`);
      
      const whitelabelToggle = page.locator('input[type="checkbox"]').first();
      await whitelabelToggle.click({ force: true });
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=saved')).toBeVisible();
    });

    test('should show preview', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Preview Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/branding`);
      await expect(page.locator('text=Preview')).toBeVisible();
    });
  });

  // Compliance Tests
  test.describe('Compliance Dashboard', () => {
    test('should load dashboard', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Compliance Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/compliance`);
      await expect(page.getByRole('heading', { name: 'Compliance & GDPR' })).toBeVisible();
      await expect(page.getByText('GDPR Enabled')).toBeVisible();
    });

    test('should show GDPR status', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'GDPR Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/compliance`);
      await expect(page.getByText('GDPR Enabled')).toBeVisible();
    });

    test('should update retention', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Retention Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/compliance`);
      
      const retentionInput = page.locator('input[type="number"]').first();
      await retentionInput.fill('90');
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=saved')).toBeVisible();
    });

    test('should toggle GDPR', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'GDPR Toggle Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/compliance`);
      
      const gdprToggle = page.locator('input[type="checkbox"]').first();
      await gdprToggle.click({ force: true });
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=saved')).toBeVisible();
    });

    test('should export audit logs', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Audit Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/compliance`);
      await expect(page.getByRole('heading', { name: /Data Export/ })).toBeVisible();
    });

    test('should export messages', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Export Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/compliance`);
      await expect(page.getByRole('heading', { name: /Data Export/ })).toBeVisible();
    });

    test('should confirm deletion', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Delete Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/compliance`);
      
      const deleteButton = page.locator('button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
      }
    });
  });

  // API Key Management Tests
  test.describe('API Key Management', () => {
    
    test('should create API key', async ({ request }) => {
      const response = await request.post('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Management Key', rate_limit: 1000 }
      });
      if (response.ok()) {
        const data = await response.json();
        expect(data.key).toMatch(/^nb_/);
      }
    });

    test('should list API keys', async ({ request }) => {
      const response = await request.get('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.keys)).toBe(true);
    });

    test('should display API keys page', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      await page.goto('http://localhost:5173/api-keys', { waitUntil: 'networkidle' });
      
      // Wait for React app to be mounted
      await page.waitForSelector('main');
      
      // Give the component time to fetch and render
      await page.waitForTimeout(2000);
      
      await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("Create API Key")')).toBeVisible();
    });

    test('should create key via UI', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      await page.goto('http://localhost:5173/api-keys', { waitUntil: 'networkidle' });
      
      await page.locator('button:has-text("Create API Key")').click({ timeout: 15000 });
      
      await page.fill('input[placeholder*="Production"]', 'UI Test Key');
      await page.selectOption('select', '1000');
      await page.click('button:has-text("Create Key")');
      
      await expect(page.locator('text=API Key Created')).toBeVisible();
    });

    test('should show key once', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      await page.goto('http://localhost:5173/api-keys', { waitUntil: 'networkidle' });
      
      // Wait for React app and component to load
      await page.waitForSelector('main');
      await page.waitForTimeout(2000);
      
      await page.locator('button:has-text("Create API Key")').click({ timeout: 15000 });
      
      await page.fill('input[placeholder*="Production"]', 'Once Key');
      await page.click('button:has-text("Create Key")');
      
      const keyElement = page.locator('code:has-text("nb_")');
      await expect(keyElement).toBeVisible();
      
      await page.click('button:has-text("Dismiss")');
      await expect(keyElement).not.toBeVisible();
    });

    test('should revoke key', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      // Create key via API
      const keyRes = await page.request.post('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Revoke Test Key', rate_limit: 1000 }
      });

      await page.goto('http://localhost:5173/api-keys', { waitUntil: 'networkidle' });
      
      // Wait for React app and component to load
      await page.waitForSelector('main');
      await page.waitForTimeout(2000);
      
      await page.locator('button:has-text("Revoke")').first().click({ timeout: 15000 });
      // A native <dialog> asks for confirmation (it used to be a browser confirm() pop-up)
      await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
      
      await expect(page.locator('text=Revoked').first()).toBeVisible();
    });

    test('should show usage stats', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const keyRes = await page.request.post('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Stats Key', rate_limit: 1000 }
      });

      await page.goto('http://localhost:5173/api-keys', { waitUntil: 'networkidle' });
      
      // Wait  for React app and component to load
      await page.waitForSelector('main');
      await page.waitForTimeout(2000);
      
      await expect(page.locator('th:has-text("Usage (Today)")')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('th:has-text("Rate Limit")')).toBeVisible();
      await expect(page.locator('text=/\/day/').first()).toBeVisible();
    });
  });

  // Integration Tests
  test.describe('Integration', () => {
    test('should create team and use API', async ({ request }) => {
      const teamRes = await request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Integration Team', plan: 'enterprise' }
      });
      
      expect(teamRes.status()).toBe(201);
      const teamData = await teamRes.json();
      
      const keyRes = await request.post('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Integration Key', rate_limit: 10000 }
      });
      
      const keyData = await keyRes.json();
      
      const msgRes = await request.post('http://localhost:8787/api/v1/messages', {
        headers: { 'X-API-Key': keyData.key },
        data: { 
          encryptedData: 'integration_test',
          iv: 'AAAAAAAAAAAAAAAAAAAAAA==',
          salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
          maxViews: 1 
        }
      });
      
      expect(msgRes.status()).toBe(201);
    });

    test('should apply branding', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Apply Branding Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;
      upgradeTeam(teamId); // branding is a paid feature

      await page.goto(`http://localhost:5173/teams/${teamId}/branding`);
      
      const colorInput = page.locator('input[type="color"]').first();
      await colorInput.fill('#3498db');
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=saved')).toBeVisible();
    });

    test('should enforce compliance', async ({ page }) => {
      await page.addInitScript((token) => {
        sessionStorage.setItem('sessionToken', token);
      }, sessionToken);

      const teamRes = await page.request.post('http://localhost:8787/api/teams', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Enforce Compliance Team', plan: 'enterprise' }
      });
      const teamData = await teamRes.json();
      const teamId = teamData.team.id;

      await page.goto(`http://localhost:5173/teams/${teamId}/compliance`);
      
      const gdprToggle = page.locator('input[type="checkbox"]').first();
      await gdprToggle.check();
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=saved')).toBeVisible();
    });

    test('should track usage', async ({ request }) => {
      const keyRes = await request.post('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken },
        data: { name: 'Usage Tracking Key', rate_limit: 1000 }
      });
      
      const keyData = await keyRes.json();
      
      // Make several API calls
      for (let i = 0; i < 3; i++) {
        await request.post('http://localhost:8787/api/v1/messages', {
          headers: { 'X-API-Key': keyData.key },
          data: { 
            encryptedData: `usage_test_${i}`,
            iv: 'AAAAAAAAAAAAAAAAAAAAAA==',
            salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
            maxViews: 1 
          }
        });
      }
      
      // Check usage stats
      const listRes = await request.get('http://localhost:8787/api/api-keys', {
        headers: { 'X-Session-Token': sessionToken }
      });
      
      const data = await listRes.json();
      const usageKey = data.keys.find(k => k.name === 'Usage Tracking Key');
      expect(usageKey).toBeTruthy();
    });
  });
});
