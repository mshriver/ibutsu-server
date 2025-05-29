import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import process from 'node:process';

/**
 * Helper function to create test results with different attributes
 * @param {string} testId - The ID of the test
 * @param {string} result - The result of the test (passed, failed, error, skipped, xfailed, xpassed)
 * @param {string} startTime - The start time of the test in ISO format
 * @returns {Object} A test result object
 */
function createTestResult(testId, result, startTime) {
  return {
    id: uuidv4(),
    test_id: testId,
    component: 'patchman',
    duration: 5.38,
    env: 'stage',
    result: result,
    start_time: startTime,
    project_id: '376264a3-0aa2-4ffd-858c-ce87bbe2602b',
    run_id: uuidv4(),
    source: 'playwright-test',
    metadata: {
      component: 'patchman',
      description: 'Test for TestHistoryTable',
      env: 'stage',
      markers: ['test', 'playwright'],
      title: testId,
      jenkins: {
        build_number: '123',
        build_url: 'http://example.com/jenkins/123',
        job_name: 'test-job',
      },
    },
  };
}

test.describe('TestHistoryTable Component', () => {
  let authToken;
  let mainTestResult;
  let testId;
  const API_BASE_URL = 'http://127.0.0.1:8080/api';
  const UI_BASE_URL = 'http://127.0.0.1:3000';

  // Setup: Create test results and authenticate
  test.beforeAll(async ({ request }) => {
    // Get auth token from environment variable or authenticate
    authToken = process.env.IBUTSU_AUTH_TOKEN;

    if (!authToken) {
      console.log(
        'No auth token found in environment variables. Authenticating...',
      );
      const loginResponse = await request.post(`${API_BASE_URL}/login`, {
        data: {
          username: 'admin@example.com',
          password: 'admin12345',
        },
      });

      expect(loginResponse.ok()).toBeTruthy();
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      console.log('Authentication successful');
    }

    // Generate a unique test ID for this test run
    testId = `test-history-playwright-${Date.now()}`;
    console.log(`Using test ID: ${testId}`);

    // Create a range of dates for test results, ranging over the last 30 days
    const now = new Date();
    const dates = [];

    // Create dates spanning different time ranges (1 day to 30 days ago)
    for (let i = 0; i < 5; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i * 7); // Each test 7 days apart
      dates.push(date.toISOString());
    }

    // Create the main test result (will be used to view history)
    mainTestResult = createTestResult(testId, 'failed', dates[0]);

    // Create additional test results with different dates and statuses
    const testResults = [
      createTestResult(testId, 'passed', dates[1]),
      createTestResult(testId, 'error', dates[2]),
      createTestResult(testId, 'skipped', dates[3]),
      createTestResult(testId, 'xfailed', dates[4]),
    ];

    // Add the main test result
    const mainResultResponse = await request.post(`${API_BASE_URL}/result`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: mainTestResult,
    });

    expect(mainResultResponse.ok()).toBeTruthy();
    console.log('Main test result created');

    // Add the additional test results
    for (const result of testResults) {
      const response = await request.post(`${API_BASE_URL}/result`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: result,
      });

      expect(response.ok()).toBeTruthy();
    }

    console.log('All test results created successfully');
  });

  test('should display TestHistoryTable with correct initial filters', async ({
    page,
  }) => {
    // Login
    await page.goto(`${UI_BASE_URL}/login`);
    await page.fill('input[name="username"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin12345');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL(`${UI_BASE_URL}/**`);

    // Navigate to the result page for the main test result
    await page.goto(`${UI_BASE_URL}/results/${mainTestResult.id}`);

    // Verify that the result page is loaded
    await page.waitForSelector('h1:has-text("Test Result")');

    // Click on the Test History tab
    await page.click('text=Test History');

    // Wait for the test history table to load
    await page.waitForSelector('h2:has-text("Test History")');

    // Verify that "Test History" heading is visible
    await expect(page.locator('h2:has-text("Test History")')).toBeVisible();

    // Verify that test_id filter is automatically applied
    const testIdFilter = page.locator(`text=${testId}`);
    await expect(testIdFilter).toBeVisible();

    // Verify that component filter is applied
    const componentFilter = page.locator('text=component: patchman');
    await expect(componentFilter).toBeVisible();

    // Verify that env filter is applied
    const envFilter = page.locator('text=env: stage');
    await expect(envFilter).toBeVisible();

    // Verify that the time range filter dropdown shows "1 Week" by default
    const timeRangeFilter = page.locator('button:has-text("1 Week")');
    await expect(timeRangeFilter).toBeVisible();

    // Verify the summary section is visible
    await expect(page.locator('text=Summary:')).toBeVisible();

    // Verify the Last passed section is visible
    await expect(page.locator('text=Last passed:')).toBeVisible();

    // Verify that table contains rows
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount.above(0);
  });

  test('should filter results when "Only show failures/errors" is checked', async ({
    page,
  }) => {
    // Login and navigate to result page
    await page.goto(`${UI_BASE_URL}/login`);
    await page.fill('input[name="username"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin12345');
    await page.click('button[type="submit"]');
    await page.goto(`${UI_BASE_URL}/results/${mainTestResult.id}`);
    await page.click('text=Test History');

    // Count the number of rows initially
    await page.waitForSelector('table tbody tr');
    const initialRowCount = await page.locator('table tbody tr').count();

    // Click the "Only show failures/errors" checkbox
    await page.click('text="Only show failures/errors"');

    // Wait for table to update
    await page.waitForTimeout(1000); // Small delay to ensure filter takes effect

    // Count rows after filtering
    const filteredRowCount = await page.locator('table tbody tr').count();

    // Should have fewer rows after filtering
    expect(filteredRowCount).toBeLessThanOrEqual(initialRowCount);

    // Verify that all visible rows have either "failed" or "error" status
    const resultCells = page.locator('table tbody tr td:nth-child(1)');
    const count = await resultCells.count();

    for (let i = 0; i < count; i++) {
      const cellText = await resultCells.nth(i).textContent();
      expect(
        ['failed', 'error'].some((status) =>
          cellText.toLowerCase().includes(status),
        ),
      ).toBeTruthy();
    }
  });

  test('should change time range when selected from dropdown', async ({
    page,
  }) => {
    // Login and navigate to result page
    await page.goto(`${UI_BASE_URL}/login`);
    await page.fill('input[name="username"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin12345');
    await page.click('button[type="submit"]');
    await page.goto(`${UI_BASE_URL}/results/${mainTestResult.id}`);
    await page.click('text=Test History');

    // Count initial rows with 1 Week filter
    await page.waitForSelector('table tbody tr');
    const initialRowCount = await page.locator('table tbody tr').count();

    // Click the time range dropdown and select "1 Month"
    await page.click('button:has-text("1 Week")');
    await page.click('text=1 Month');

    // Wait for table to update
    await page.waitForTimeout(1000); // Small delay to ensure filter takes effect

    // Should have potentially more rows after expanding time range
    const newRowCount = await page.locator('table tbody tr').count();
    expect(newRowCount).toBeGreaterThanOrEqual(initialRowCount);

    // Verify that the dropdown now shows "1 Month"
    await expect(page.locator('button:has-text("1 Month")')).toBeVisible();
  });

  test('should expand test result details when row is clicked', async ({
    page,
  }) => {
    // Login and navigate to result page
    await page.goto(`${UI_BASE_URL}/login`);
    await page.fill('input[name="username"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin12345');
    await page.click('button[type="submit"]');
    await page.goto(`${UI_BASE_URL}/results/${mainTestResult.id}`);
    await page.click('text=Test History');

    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Click the expand button on the first row
    await page.click('table tbody tr:first-child button[aria-label="Details"]');

    // Wait for expanded content to appear
    await page.waitForSelector('.pf-v5-c-table__expandable-row');

    // Verify that expanded row is visible
    await expect(page.locator('.pf-v5-c-table__expandable-row')).toBeVisible();

    // Verify that expanded content shows some test details
    const expandedContent = page.locator(
      '.pf-v5-c-table__expandable-row-content',
    );
    await expect(expandedContent).toBeVisible();

    // ResultView should be rendered in the expanded row
    await expect(page.locator('.pf-v5-c-tabs')).toBeVisible();
  });

  test('should update filters when an active filter is removed', async ({
    page,
  }) => {
    // Login and navigate to result page
    await page.goto(`${UI_BASE_URL}/login`);
    await page.fill('input[name="username"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin12345');
    await page.click('button[type="submit"]');
    await page.goto(`${UI_BASE_URL}/results/${mainTestResult.id}`);
    await page.click('text=Test History');

    // Wait for filters to load
    await page.waitForSelector('.pf-v5-c-chip-group');

    // Find and remove the environment filter
    const envFilterCloseButton = page
      .locator('.pf-v5-c-chip-group:has-text("env")')
      .locator('button[aria-label="close"]');
    await envFilterCloseButton.click();

    // Wait for table to update
    await page.waitForTimeout(1000);

    // Verify the env filter is gone
    const envFilterAfterRemoval = page.locator(
      '.pf-v5-c-chip-group:has-text("env: stage")',
    );
    await expect(envFilterAfterRemoval).toHaveCount(0);

    // Table should still have rows since we're only removing one filter
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount.above(0);
  });

  test('should display correct LastPassed and Summary information', async ({
    page,
  }) => {
    // Login and navigate to result page
    await page.goto(`${UI_BASE_URL}/login`);
    await page.fill('input[name="username"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin12345');
    await page.click('button[type="submit"]');
    await page.goto(`${UI_BASE_URL}/results/${mainTestResult.id}`);
    await page.click('text=Test History');

    // Wait for filters and summary to load
    await page.waitForSelector('text=Summary:');
    await page.waitForSelector('text=Last passed:');

    // Verify that summary shows counts for different result types
    const summaryText = await page
      .locator('text=Summary:')
      .locator('xpath=..')
      .textContent();

    // The summary should include at least passed/failed counts
    expect(summaryText).toContain('Summary:');
    expect(
      ['passes', 'failures', 'errors', 'skips'].some((type) =>
        summaryText.toLowerCase().includes(type),
      ),
    ).toBeTruthy();

    // Last passed should show the date of the most recent passed test
    const lastPassedText = await page
      .locator('text=Last passed:')
      .locator('xpath=..')
      .textContent();
    expect(lastPassedText).toContain('Last passed:');
    // Since we created a passed result, it should not say "No passing runs found"
    expect(lastPassedText).not.toContain('No passing runs found');
  });
});
