# End-to-End Testing

NoteBurner uses [Playwright](https://playwright.dev/) for comprehensive end-to-end testing.

## Test Coverage

### 1. Message Creation Tests (`e2e/create-message.spec.js`)
- ✅ Creating simple text messages
- ✅ Password generation
- ✅ Message expiration settings
- ✅ File attachment uploads
- ✅ Password validation
- ✅ Copy to clipboard functionality
- ✅ "Create Similar Message" workflow
- ✅ Form reset functionality

### 2. Message Viewing Tests (`e2e/view-message.spec.js`)
- ✅ Preview page display
- ✅ Transition from preview to password form
- ✅ Successful decryption
- ✅ Wrong password handling
- ✅ One-time access enforcement
- ✅ Password visibility toggle
- ✅ Countdown timer for expiring messages
- ✅ Post-burn CTAs
- ✅ File attachment downloads

### 3. Viral Mechanics Tests (`e2e/viral-mechanics.spec.js`)
- ✅ Animated stats counters
- ✅ Rotating loading messages
- ✅ Upload progress personality
- ✅ Confetti celebration animation
- ✅ Enhanced CTAs after decryption
- ✅ Animated lock on preview page
- ✅ Quick recreation workflow
- ✅ Social share buttons

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Run Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug

# View last test report
npm run test:report
```

### Run Specific Tests

```bash
# Run single test file
npx playwright test e2e/create-message.spec.js

# Run tests matching a pattern
npx playwright test --grep "should create"

# Run a specific test
npx playwright test -g "should create a simple text message"
```

## Test Configuration

Tests are configured in `playwright.config.js`:
- **Base URL**: `http://localhost:5173`
- **Browser**: Chromium (Desktop Chrome simulation)
- **Automatic Server Start**: Both frontend and backend dev servers
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: Captured on failure
- **Traces**: Captured on first retry

## CI/CD Integration

Tests run automatically on:
- Every push to `main` or `feature/*` branches
- Every pull request to `main`

GitHub Actions workflow: `.github/workflows/e2e-tests.yml`

Test reports and screenshots are uploaded as artifacts for failed runs.

## Writing New Tests

### Example Test Structure

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/');
    
    // Interact
    await page.fill('input[name="field"]', 'value');
    await page.click('button:has-text("Submit")');
    
    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for critical elements (optional but recommended)
2. **Wait for visibility** before assertions: `await expect(...).toBeVisible()`
3. **Use specific selectors** to avoid flakiness
4. **Test user flows** end-to-end, not just individual features
5. **Clean up after tests** if creating persistent data
6. **Use beforeEach/afterEach** for common setup/teardown
7. **Keep tests independent** - each test should run in isolation

### Debugging Tips

```bash
# Run with headed browser to see what's happening
npm run test:e2e:headed

# Use debug mode for step-through debugging
npm run test:e2e:debug

# Add this to pause test execution
await page.pause();

# Take screenshots during test
await page.screenshot({ path: 'screenshot.png' });

# Print page content for debugging
console.log(await page.content());
```

## Test Data

Tests use randomized test data to avoid conflicts:
- Passwords: Pattern like `TestPassword123!`
- Messages: Descriptive based on test purpose
- Files: Generated in-memory buffers

## Known Limitations

- **Confetti Animation**: Canvas confetti may not work in headless mode
- **Clipboard**: Requires clipboard permissions grant
- **File Downloads**: Download assertions limited in headless mode
- **Timing**: Some animations may complete too fast to verify

## Troubleshooting

### Tests Fail Locally But Pass in CI
- Check Node.js version (should be 20+)
- Ensure dev servers start successfully
- Clear browser cache: `npx playwright clean`

### Tests Time Out
- Increase timeout in test: `test.setTimeout(60000)`
- Check if dev servers are running
- Verify network connectivity to localhost

### Screenshots Not Generated
- Ensure `use.screenshot` is set in config
- Check `test-results/` directory
- Run with `--trace on` for full traces

## Future Enhancements

- [ ] Visual regression testing with snapshots
- [ ] Performance testing with Lighthouse
- [ ] Accessibility testing with axe-core
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Mobile viewport testing
- [ ] API contract testing
