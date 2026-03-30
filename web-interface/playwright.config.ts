import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Heretek OpenClaw Web UI tests.
 * 
 * Usage:
 *   npx playwright test                  # Run all tests
 *   npx playwright test --project=chromium  # Run specific browser
 *   npx playwright test --ui               # Run with UI
 *   npx playwright test --debug            # Run in debug mode
 */

export default defineConfig({
  // Test directory and files
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail CI on first failure
  forbidOnly: false,
  
  // Retry failed tests
  retries: 0,
  
  // Workers (parallel test execution)
  workers: undefined,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'playwright-results.json' }]
  ],
  
  // Use shared settings for all projects
  use: {
    // Base URL
    baseURL: 'http://localhost:3000',
    
    // Trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // Projects (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // Local development server
  webServer: {
    command: 'npm run preview -- --port 3000',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
