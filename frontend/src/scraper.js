// scraper.js
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrapeAlumni(university, dreamCareer) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Strategy: Use Google to find LinkedIn profiles to avoid LinkedIn's login wall
  const query = `site:linkedin.com/in/ "${university}" "${dreamCareer}" "salary"`;
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);

  // Extract titles and links
  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.g')).map(el => ({
      name: el.querySelector('h3')?.innerText,
      url: el.querySelector('a')?.href,
      snippet: el.querySelector('.VwiC3b')?.innerText
    })).slice(0, 5);
  });

  await browser.close();
  return results;
}