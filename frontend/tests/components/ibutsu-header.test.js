// Assisted by watsonx Code Assistant

import { chromium, browser, test, expect } from 'playwright';
import path from 'path';

import IbutsuHeader from '../../src/components/ibutsu-header';

test('IbutsuHeader renders', async ({ page }) => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext();
  const pageInstance = await context.newPage();

  await pageInstance.goto('http://localhost:3000');

  // TODO login in setup hooks
  await pageInstance.waitForSelector('login-input-email');
  await pageInstance.fill('login-input-email', 'admin@example.com');

  await pageInstance.waitForSelector('login-input-password');
  await pageInstance.fill('login-input-password', 'admin12345');

  await pageInstance.waitForSelector('login-button');
  await pageInstance.click('login-button');

  await pageInstance.waitForSelector('header-masthead')

});
