import { test, expect } from './fixtures.js';

test.describe('Import Component', () => {
  test('should display import button and open file dialog', async ({
    page,
    componentRenderer,
    importComponent,
  }) => {
    // Navigate to the main page where import functionality is available
    await componentRenderer.navigateToComponent('/');

    // Wait for the page to load and find the import button
    await page.waitForSelector('button:has-text("Import")');

    // Verify import button is visible
    const importButton = page.locator('button:has-text("Import")');
    await expect(importButton).toBeVisible();

    // Click the import button to open file dialog
    await importButton.click();

    // Verify file input appears
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Verify file input accepts .tar.gz files
    const acceptAttribute = await fileInput.getAttribute('accept');
    expect(acceptAttribute).toContain('application/gzip');
  });

  test('should handle file upload and show upload progress', async ({
    page,
    componentRenderer,
    importComponent,
  }) => {
    // Create a sample file for upload
    const { file, content } =
      await importComponent.createSampleFile('test-upload.tar.gz');

    // Navigate to import functionality
    await componentRenderer.navigateToComponent('/');

    // Upload the file
    await importComponent.uploadFile(file);

    // Verify upload was initiated
    await page.waitForSelector('text="Uploading"');

    // Wait for upload completion notification
    await page.waitForSelector('text="Import started"', { timeout: 10000 });

    // Verify the imported file name is displayed
    await expect(page.locator(`text="${file.name}"`)).toBeVisible();
  });

  test('should display import status and completion', async ({
    page,
    componentRenderer,
    importComponent,
  }) => {
    // Create sample file
    const { file, content } =
      await importComponent.createSampleFile('status-test.tar.gz');

    // Navigate and upload
    await componentRenderer.navigateToComponent('/');
    await importComponent.uploadFile(file);

    // Wait for import to start
    await page.waitForSelector('text="Import started"');

    // The mock will show the import as completed
    await page.waitForSelector('text="Import completed"', { timeout: 15000 });

    // Verify success message
    await expect(page.locator('text="Import completed"')).toBeVisible();

    // Verify import details are shown
    await expect(page.locator(`text="${file.name}"`)).toBeVisible();
  });

  test('should handle multiple file imports', async ({
    page,
    componentRenderer,
    importComponent,
  }) => {
    // Navigate to import page
    await componentRenderer.navigateToComponent('/');

    // Create and upload first file
    const { file: file1 } =
      await importComponent.createSampleFile('import1.tar.gz');
    await importComponent.uploadFile(file1);
    await page.waitForSelector('text="Import started"');

    // Wait a moment and upload second file
    await page.waitForTimeout(1000);

    const { file: file2 } =
      await importComponent.createSampleFile('import2.tar.gz');
    await importComponent.uploadFile(file2);
    await page.waitForSelector('text="Import started"');

    // Verify both files are listed
    await expect(page.locator(`text="${file1.name}"`)).toBeVisible();
    await expect(page.locator(`text="${file2.name}"`)).toBeVisible();
  });

  test('should show import history and status list', async ({
    page,
    componentRenderer,
    importComponent,
  }) => {
    // Set up mock import history
    await page.route('**/api/import**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            imports: [
              {
                id: 'import-1',
                filename: 'test1.tar.gz',
                status: 'done',
                created: new Date().toISOString(),
                metadata: { run_id: 'run-1' },
              },
              {
                id: 'import-2',
                filename: 'test2.tar.gz',
                status: 'pending',
                created: new Date().toISOString(),
                metadata: {},
              },
              {
                id: 'import-3',
                filename: 'test3.tar.gz',
                status: 'failed',
                created: new Date().toISOString(),
                metadata: {},
              },
            ],
          }),
        });
      }
    });

    // Navigate to imports page or section
    await componentRenderer.navigateToComponent('/imports');

    // Verify import history table is displayed
    await page.waitForSelector('table');

    // Verify all three imports are shown
    await expect(page.locator('text="test1.tar.gz"')).toBeVisible();
    await expect(page.locator('text="test2.tar.gz"')).toBeVisible();
    await expect(page.locator('text="test3.tar.gz"')).toBeVisible();

    // Verify different statuses are displayed
    await expect(page.locator('text="done"')).toBeVisible();
    await expect(page.locator('text="pending"')).toBeVisible();
    await expect(page.locator('text="failed"')).toBeVisible();
  });

  test('should validate file types and show error for invalid files', async ({
    page,
    componentRenderer,
    importComponent,
  }) => {
    // Navigate to import functionality
    await componentRenderer.navigateToComponent('/');

    // Try to upload an invalid file type
    const invalidFile = new File(['invalid content'], 'test.txt', {
      type: 'text/plain',
    });

    // Mock validation error response
    await page.route('**/api/import', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid file type. Only .tar.gz files are allowed.',
          }),
        });
      }
    });

    // Attempt upload
    const importButton = page.locator('button:has-text("Import")');
    await importButton.click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: invalidFile.name,
      mimeType: invalidFile.type,
      buffer: Buffer.from(await invalidFile.arrayBuffer()),
    });

    // Verify error message is displayed
    await page.waitForSelector('text="Invalid file type"');
    await expect(page.locator('text="Invalid file type"')).toBeVisible();
  });

  test('should handle large file uploads with progress indication', async ({
    page,
    componentRenderer,
    importComponent,
  }) => {
    // Create a larger sample file
    const largeContent = 'x'.repeat(1024 * 1024); // 1MB of content
    const largeFile = new File([largeContent], 'large-test.tar.gz', {
      type: 'application/gzip',
    });

    // Mock slow upload response
    await page.route('**/api/import', async (route) => {
      if (route.request().method() === 'POST') {
        // Simulate slow response
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'large-import-id',
            filename: 'large-test.tar.gz',
            status: 'pending',
            metadata: {},
          }),
        });
      }
    });

    // Navigate and upload
    await componentRenderer.navigateToComponent('/');
    await importComponent.uploadFile(largeFile);

    // Verify upload progress indicators
    await expect(page.locator('text="Uploading"')).toBeVisible();

    // Wait for upload completion
    await page.waitForSelector('text="Import started"', { timeout: 15000 });
    await expect(page.locator('text="Import started"')).toBeVisible();
  });
});
