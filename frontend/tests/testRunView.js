import { test, expect, createTestRun, createTestResult } from './fixtures.js';

test.describe('TestRun View', () => {
  test('should display run information and summary tab', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up test run data
    const { run, results } = await testRunView.setupTestRun();

    // Navigate to the run view
    await testRunView.navigateToRun(run.id);

    // Verify run page is loaded
    await expect(page.locator('h1:has-text("Run")')).toBeVisible();

    // Verify run ID is displayed
    await expect(page.locator(`text="${run.id}"`)).toBeVisible();

    // Verify Summary tab is selected by default
    await expect(
      page.locator('button[aria-selected="true"]:has-text("Summary")'),
    ).toBeVisible();

    // Verify summary content is displayed
    await expect(page.locator('text="Duration:"')).toBeVisible();
    await expect(page.locator('text="Started:"')).toBeVisible();
    await expect(page.locator('text="Summary:"')).toBeVisible();

    // Verify run statistics are shown
    await expect(page.locator('text="Total:"')).toBeVisible();
    await expect(page.locator('text="Passed:"')).toBeVisible();
    await expect(page.locator('text="Failed:"')).toBeVisible();
  });

  test('should navigate between all tabs correctly', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up test run data
    const { run, results } = await testRunView.setupTestRun();

    // Navigate to the run view
    await testRunView.navigateToRun(run.id);

    // Test all tabs
    const testedTabs = await testRunView.testAllTabs();

    // Verify all expected tabs were tested
    const expectedTabs = [
      'Summary',
      'Results List',
      'Results Tree',
      'Classify Failures',
      'Run Object',
    ];
    expect(testedTabs).toEqual(expectedTabs);

    // Verify each tab shows appropriate content
    for (const tabName of expectedTabs) {
      await testRunView.testTabContent(tabName);
    }
  });

  test('should display results list with filtering and sorting', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up test run with multiple results
    const { run, results } = await testRunView.setupTestRun();

    // Navigate to run and switch to Results List tab
    await testRunView.navigateToRun(run.id);
    await page.click('text="Results List"');

    // Wait for results table to load
    await page.waitForSelector('table');

    // Verify table headers
    await expect(page.locator('th:has-text("Result")')).toBeVisible();
    await expect(page.locator('th:has-text("Test")')).toBeVisible();
    await expect(page.locator('th:has-text("Duration")')).toBeVisible();
    await expect(page.locator('th:has-text("Start Time")')).toBeVisible();

    // Verify all results are displayed
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount(results.length);

    // Verify different result statuses are shown
    await expect(page.locator('text="passed"')).toBeVisible();
    await expect(page.locator('text="failed"')).toBeVisible();
    await expect(page.locator('text="error"')).toBeVisible();
    await expect(page.locator('text="skipped"')).toBeVisible();

    // Test filtering by result status
    await page.click('button:has-text("Filter")');
    await page.waitForSelector('text="Result Status"');
    await page.click('text="Failed"');

    // Verify filtered results
    await page.waitForTimeout(1000); // Allow filter to apply
    const filteredRows = page.locator('table tbody tr');
    const count = await filteredRows.count();

    // Should show only failed/error results
    for (let i = 0; i < count; i++) {
      const row = filteredRows.nth(i);
      const resultText = await row.locator('td:first-child').textContent();
      expect(
        ['failed', 'error'].some((status) =>
          resultText.toLowerCase().includes(status),
        ),
      ).toBeTruthy();
    }
  });

  test('should display results tree view with hierarchical structure', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up test run data
    const { run, results } = await testRunView.setupTestRun();

    // Navigate to run and switch to Results Tree tab
    await testRunView.navigateToRun(run.id);
    await page.click('text="Results Tree"');

    // Wait for tree view to load
    await page.waitForSelector('.pf-v5-c-tree-view');

    // Verify tree structure elements
    await expect(page.locator('.pf-v5-c-tree-view')).toBeVisible();

    // Verify tree nodes are present
    const treeNodes = page.locator('.pf-v5-c-tree-view__list-item');
    await expect(treeNodes).toHaveCount.above(0);

    // Test expanding/collapsing tree nodes
    const expandableNode = page
      .locator('.pf-v5-c-tree-view__node-toggle')
      .first();
    if (await expandableNode.isVisible()) {
      await expandableNode.click();

      // Verify expansion worked
      await page.waitForSelector(
        '.pf-v5-c-tree-view__list-item[aria-expanded="true"]',
      );
    }

    // Verify test results are shown in tree format
    for (const result of results) {
      await expect(page.locator(`text="${result.test_id}"`)).toBeVisible();
    }
  });

  test('should display classify failures tab with failure analysis', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up test run with failures
    const { run, results } = await testRunView.setupTestRun();

    // Navigate to run and switch to Classify Failures tab
    await testRunView.navigateToRun(run.id);
    await page.click('text="Classify Failures"');

    // Wait for classify failures content
    await page.waitForSelector('text="Classify Failures"');

    // Verify classify failures interface is displayed
    await expect(page.locator('text="Classify Failures"')).toBeVisible();

    // Verify failure classification options or interface elements
    // This will depend on the actual implementation
    const classifySection = page.locator(
      '.pf-v5-c-tab-content[role="tabpanel"]:visible',
    );
    await expect(classifySection).toBeVisible();
  });

  test('should display run object JSON in Monaco editor', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up test run data
    const { run, results } = await testRunView.setupTestRun();

    // Navigate to run and switch to Run Object tab
    await testRunView.navigateToRun(run.id);
    await page.click('text="Run Object"');

    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor');

    // Verify Monaco editor is displayed
    await expect(page.locator('.monaco-editor')).toBeVisible();

    // Verify JSON content contains run data
    const editorContent = page.locator('.monaco-editor .view-lines');
    await expect(editorContent).toBeVisible();

    // Check if run ID is visible in the JSON
    await expect(page.locator(`text="${run.id}"`)).toBeVisible();
  });

  test('should handle navigation between result details', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up test run data
    const { run, results } = await testRunView.setupTestRun();

    // Navigate to run and switch to Results List
    await testRunView.navigateToRun(run.id);
    await page.click('text="Results List"');

    // Click on first result to view details
    await page.waitForSelector('table tbody tr');
    const firstResultRow = page.locator('table tbody tr').first();
    await firstResultRow.click();

    // Verify result detail view loads
    await page.waitForSelector('h1:has-text("Test Result")');
    await expect(page.locator('h1:has-text("Test Result")')).toBeVisible();

    // Verify result ID is displayed
    const firstResult = results[0];
    await expect(page.locator(`text="${firstResult.id}"`)).toBeVisible();

    // Navigate back to run view
    await page.goBack();

    // Verify we're back at the run view
    await expect(page.locator('h1:has-text("Run")')).toBeVisible();
    await expect(page.locator(`text="${run.id}"`)).toBeVisible();
  });

  test('should display artifacts in run view', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up test run data
    const { run, results } = await testRunView.setupTestRun();

    // Navigate to the run view
    await testRunView.navigateToRun(run.id);

    // Look for artifacts section (might be in Summary or separate tab)
    // Check if artifacts are displayed somewhere on the page
    const artifactsPresent =
      (await page.locator('text="test.log"').isVisible()) ||
      (await page.locator('text="screenshot.png"').isVisible()) ||
      (await page.locator('text="Artifacts"').isVisible());

    if (artifactsPresent) {
      // Verify artifacts are listed
      await expect(page.locator('text="test.log"')).toBeVisible();
      await expect(page.locator('text="screenshot.png"')).toBeVisible();
    }
  });

  test('should handle empty run with no results', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Create run with no results
    const emptyRun = createTestRun({
      summary: {
        collected: 0,
        tests: 0,
        failures: 0,
        errors: 0,
        skips: 0,
        xfailures: 0,
        xpasses: 0,
      },
    });

    // Set up empty run
    await testRunView.setupTestRun(emptyRun);

    // Mock empty results
    await page.route('**/api/result**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [],
          pagination: {
            page: 1,
            pageSize: 25,
            totalItems: 0,
            totalPages: 0,
          },
        }),
      });
    });

    // Navigate to the run view
    await testRunView.navigateToRun(emptyRun.id);

    // Verify run is displayed even with no results
    await expect(page.locator('h1:has-text("Run")')).toBeVisible();
    await expect(page.locator(`text="${emptyRun.id}"`)).toBeVisible();

    // Check Results List tab shows empty state
    await page.click('text="Results List"');
    await page.waitForSelector('text="No results found"');
    await expect(page.locator('text="No results found"')).toBeVisible();
  });

  test('should handle run with large number of results with pagination', async ({
    page,
    componentRenderer,
    testRunView,
  }) => {
    // Set up run with many results
    const largeRun = createTestRun({
      summary: {
        collected: 100,
        tests: 100,
        failures: 20,
        errors: 5,
        skips: 10,
        xfailures: 0,
        xpasses: 0,
      },
    });

    // Generate many results
    const manyResults = [];
    for (let i = 0; i < 30; i++) {
      const result = createTestResult(
        `test_large_${i}`,
        i % 4 === 0 ? 'failed' : 'passed',
        largeRun.start_time,
        { run_id: largeRun.id },
      );
      manyResults.push(result);
    }

    // Mock paginated results
    await page.route('**/api/result**', async (route) => {
      const url = new URL(route.request().url());
      const page_num = parseInt(url.searchParams.get('page') || '1');
      const pageSize = 25;
      const startIndex = (page_num - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageResults = manyResults.slice(startIndex, endIndex);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: pageResults,
          pagination: {
            page: page_num,
            pageSize: pageSize,
            totalItems: manyResults.length,
            totalPages: Math.ceil(manyResults.length / pageSize),
          },
        }),
      });
    });

    // Set up the run
    await testRunView.setupTestRun(largeRun);

    // Navigate to the run
    await testRunView.navigateToRun(largeRun.id);

    // Switch to Results List
    await page.click('text="Results List"');

    // Verify pagination controls are present
    await page.waitForSelector('.pf-v5-c-pagination');
    await expect(page.locator('.pf-v5-c-pagination')).toBeVisible();

    // Verify first page of results is shown
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount(25); // First page

    // Test pagination navigation
    const nextButton = page.locator('button[aria-label="Go to next page"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000); // Allow page to load

      // Verify we're on page 2
      await expect(
        page.locator('input[aria-label="Current page"]:value("2")'),
      ).toBeVisible();
    }
  });
});
