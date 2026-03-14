const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3880';
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'playwright');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function captureState(page, name) {
  const safe = name.replace(/\s+/g, '-').toLowerCase();
  const screenshotPath = path.join(OUTPUT_DIR, `${safe}.png`);
  const htmlPath = path.join(OUTPUT_DIR, `${safe}.html`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await fs.promises.writeFile(htmlPath, await page.content(), 'utf8');
  return { screenshotPath, htmlPath };
}

async function findLanguageButton(page) {
  const candidates = [
    page.getByRole('button', { name: /language/i }),
    page.getByRole('combobox', { name: /language/i }),
    page.getByText(/^language$/i),
  ];

  for (const locator of candidates) {
    if ((await locator.count()) > 0) {
      return locator.first();
    }
  }

  return null;
}

async function openSettingsIfPresent(page) {
  const possibleButtons = [
    page.getByRole('button', { name: /settings/i }),
    page.getByRole('button', { name: /open settings/i }),
    page.locator('[data-testid*="settings"]').first(),
  ];

  for (const locator of possibleButtons) {
    if ((await locator.count()) > 0) {
      await locator.click();
      await page.waitForTimeout(1000);
      return true;
    }
  }

  return false;
}

async function collectTexts(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('body *'))
      .map((el) => (el.innerText || '').trim())
      .filter(Boolean)
      .slice(0, 120);
  });
}

async function run() {
  await ensureDir(OUTPUT_DIR);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const summary = {
    baseUrl: BASE_URL,
    defaultLanguageAttr: null,
    defaultTextsSample: [],
    settingsOpened: false,
    languageControlFound: false,
    dropdownOptions: [],
    arabicLanguageAttr: null,
    arabicTextsSample: [],
    files: {},
  };

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    summary.defaultLanguageAttr = await page.locator('html').getAttribute('lang');
    summary.defaultTextsSample = await collectTexts(page);
    summary.files.default = await captureState(page, 'default-english');

    summary.settingsOpened = await openSettingsIfPresent(page);
    const langControl = await findLanguageButton(page);
    summary.languageControlFound = !!langControl;

    if (langControl) {
      await langControl.click();
      await page.waitForTimeout(500);

      const options = page.getByRole('option');
      const optionCount = await options.count();
      if (optionCount > 0) {
        for (let i = 0; i < optionCount; i += 1) {
          summary.dropdownOptions.push((await options.nth(i).innerText()).trim());
        }
      } else {
        const menuTexts = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('[role="listbox"], [data-radix-popper-content-wrapper], [role="menu"] *'))
            .map((el) => (el.innerText || '').trim())
            .filter(Boolean);
        });
        summary.dropdownOptions = [...new Set(menuTexts)];
      }

      const arabicOption = page.getByText(/arabic|العربية/i).first();
      if ((await arabicOption.count()) > 0) {
        await arabicOption.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        summary.arabicLanguageAttr = await page.locator('html').getAttribute('lang');
        summary.arabicTextsSample = await collectTexts(page);
        summary.files.arabic = await captureState(page, 'arabic');
      }
    }

    const resultPath = path.join(OUTPUT_DIR, 'language-test-result.json');
    await fs.promises.writeFile(resultPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
