import { test as base } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

/**
 * Updated TestResult mockup based on OpenAPI YAML spec
 * Metadata is now an empty object as requested
 */
export const createTestResult = (testId, result, startTime, overrides = {}) => {
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
    metadata: {}, // Empty object as requested
    params: {},
    classification: null,
    created: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Updated TestRun mockup based on OpenAPI YAML spec
 * Metadata is now an empty object as requested
 */
export const createTestRun = (overrides = {}) => {
  const runId = uuidv4();
  return {
    id: runId,
    created: new Date().toISOString(),
    start_time: new Date().toISOString(),
    duration: 125.5,
    summary: {
      collected: 10,
      tests: 10,
      failures: 2,
      errors: 1,
      skips: 1,
      xfailures: 0,
      xpasses: 0,
    },
    metadata: {}, // Empty object as requested
    source: 'playwright-test',
    project_id: '376264a3-0aa2-4ffd-858c-ce87bbe2602b',
    ...overrides,
  };
};

/**
 * Create a sample .tar.gz archive content for import testing
 * This creates a minimal valid archive structure
 */
export const createSampleArchiveContent = (runId = null) => {
  if (!runId) {
    runId = uuidv4();
  }

  const run = createTestRun({ id: runId });
  const results = [
    createTestResult('test_sample_pass', 'passed', run.start_time, {
      run_id: runId,
    }),
    createTestResult('test_sample_fail', 'failed', run.start_time, {
      run_id: runId,
    }),
  ];

  // Structure mimics the pytest-ibutsu archive format
  return {
    runId,
    run,
    results,
    // This would be used to generate actual tar.gz content if needed
    archiveStructure: {
      [`${runId}/run.json`]: JSON.stringify(run),
      [`${runId}/${results[0].id}/result.json`]: JSON.stringify(results[0]),
      [`${runId}/${results[1].id}/result.json`]: JSON.stringify(results[1]),
      [`${runId}/${results[0].id}/test.log`]:
        'Sample log content for passed test',
      [`${runId}/${results[1].id}/test.log`]:
        'Sample log content for failed test',
    },
  };
};

/**
 * Playwright fixture to render components without requiring login
 * This sets up authentication bypass and provides component rendering utilities
 */
export const test = base.extend({
  /**
   * Component renderer fixture that bypasses authentication
   */
  componentRenderer: async ({ page }, use) => {
    // Set up authentication bypass by mocking the auth state
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-auth-token',
          user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            is_superadmin: false,
          },
        }),
      });
    });

    // Mock user authentication check
    await page.route('**/api/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          is_superadmin: false,
        }),
      });
    });

    // Mock project list for header
    await page.route('**/api/project**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projects: [
            {
              id: '376264a3-0aa2-4ffd-858c-ce87bbe2602b',
              name: 'test-project',
              title: 'Test Project',
            },
          ],
        }),
      });
    });

    const renderer = {
      /**
       * Navigate to a component view and set up authentication
       */
      async navigateToComponent(path) {
        // Set authentication token in localStorage
        await page.addInitScript(() => {
          localStorage.setItem('auth-token', 'mock-auth-token');
          localStorage.setItem(
            'user',
            JSON.stringify({
              id: 'test-user-id',
              name: 'Test User',
              email: 'test@example.com',
              is_superadmin: false,
            }),
          );
        });

        await page.goto(`http://127.0.0.1:3000${path}`);
        return page;
      },

      /**
       * Mock API responses for a specific component
       */
      async mockApiResponses(responses) {
        for (const [pattern, response] of Object.entries(responses)) {
          await page.route(pattern, async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(response),
            });
          });
        }
      },

      /**
       * Wait for component to be fully loaded
       */
      async waitForComponent(selector) {
        await page.waitForSelector(selector);
        await page.waitForLoadState('networkidle');
        return page.locator(selector);
      },
    };

    await use(renderer);
  },

  /**
   * Import component fixture with sample files and mock responses
   */
  importComponent: async ({ page, componentRenderer }, use) => {
    // Set up import-specific API mocks
    await page.route('**/api/import', async (route) => {
      if (route.request().method() === 'POST') {
        const importId = uuidv4();
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            id: importId,
            filename: 'sample-import.tar.gz',
            status: 'pending',
            metadata: {},
          }),
        });
      }
    });

    // Mock import status endpoint
    await page.route('**/api/import/*', async (route) => {
      const importId = route.request().url().split('/').pop();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: importId,
          filename: 'sample-import.tar.gz',
          status: 'done',
          metadata: {
            run_id: uuidv4(),
            project_id: '376264a3-0aa2-4ffd-858c-ce87bbe2602b',
          },
        }),
      });
    });

    const importHelper = {
      /**
       * Create a sample file for import testing
       */
      async createSampleFile(filename = 'sample-test.tar.gz') {
        const archiveContent = createSampleArchiveContent();

        // Create a minimal tar.gz-like structure as a Blob
        const fileContent = JSON.stringify(archiveContent.archiveStructure);
        const file = new File([fileContent], filename, {
          type: 'application/gzip',
        });

        return { file, content: archiveContent };
      },

      /**
       * Simulate file upload in the UI
       */
      async uploadFile(file) {
        // Navigate to a page with the import button
        await componentRenderer.navigateToComponent('/');

        // Wait for the import button to be available
        const importButton = await page.locator('button:has-text("Import")');
        await importButton.waitFor();

        // Trigger the file input
        await importButton.click();

        // Set the file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
          name: file.name,
          mimeType: file.type,
          buffer: Buffer.from(await file.arrayBuffer()),
        });

        return file;
      },
    };

    await use(importHelper);
  },

  /**
   * TestRun view fixture with comprehensive tab testing support
   */
  testRunView: async ({ page, componentRenderer }, use) => {
    const testRunHelper = {
      /**
       * Set up a test run with mock data
       */
      async setupTestRun(runData = null) {
        const run = runData || createTestRun();
        const results = [
          createTestResult('test_example_1', 'passed', run.start_time, {
            run_id: run.id,
          }),
          createTestResult('test_example_2', 'failed', run.start_time, {
            run_id: run.id,
          }),
          createTestResult('test_example_3', 'error', run.start_time, {
            run_id: run.id,
          }),
          createTestResult('test_example_4', 'skipped', run.start_time, {
            run_id: run.id,
          }),
        ];

        // Mock run API
        await page.route(`**/api/run/${run.id}`, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(run),
          });
        });

        // Mock results API for the run
        await page.route('**/api/result**', async (route) => {
          const url = new URL(route.request().url());
          const runId = url.searchParams.get('run_id');

          if (runId === run.id) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                results,
                pagination: {
                  page: 1,
                  pageSize: 25,
                  totalItems: results.length,
                  totalPages: 1,
                },
              }),
            });
          }
        });

        // Mock artifacts API
        await page.route('**/api/artifact**', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              artifacts: [
                {
                  id: uuidv4(),
                  filename: 'test.log',
                  run_id: run.id,
                },
                {
                  id: uuidv4(),
                  filename: 'screenshot.png',
                  run_id: run.id,
                },
              ],
            }),
          });
        });

        return { run, results };
      },

      /**
       * Navigate to test run view
       */
      async navigateToRun(runId) {
        await componentRenderer.navigateToComponent(`/runs/${runId}`);
        await page.waitForSelector('h1:has-text("Run")');
        return page;
      },

      /**
       * Test all tabs in the run view
       */
      async testAllTabs() {
        const expectedTabs = [
          'Summary',
          'Results List',
          'Results Tree',
          'Classify Failures',
          'Run Object',
        ];

        for (const tabName of expectedTabs) {
          await page.click(`text="${tabName}"`);
          await page.waitForSelector('.pf-v5-c-tab-content[role="tabpanel"]');

          // Verify tab content is visible
          const tabContent = page.locator(
            '.pf-v5-c-tab-content[role="tabpanel"]:visible',
          );
          await tabContent.waitFor();
        }

        return expectedTabs;
      },

      /**
       * Test specific tab functionality
       */
      async testTabContent(tabName) {
        await page.click(`text="${tabName}"`);
        await page.waitForSelector('.pf-v5-c-tab-content[role="tabpanel"]');

        const tabTests = {
          Summary: async () => {
            await page.waitForSelector('text="Duration:"');
            await page.waitForSelector('text="Started:"');
            await page.waitForSelector('text="Summary:"');
          },
          'Results List': async () => {
            await page.waitForSelector('table');
            await page.waitForSelector('tbody tr');
          },
          'Results Tree': async () => {
            await page.waitForSelector('.pf-v5-c-tree-view');
          },
          'Classify Failures': async () => {
            await page.waitForSelector('text="Classify Failures"');
          },
          'Run Object': async () => {
            await page.waitForSelector('.monaco-editor');
          },
        };

        if (tabTests[tabName]) {
          await tabTests[tabName]();
        }

        return page;
      },
    };

    await use(testRunHelper);
  },
});

// Export the expect function from Playwright
export { expect } from '@playwright/test';
