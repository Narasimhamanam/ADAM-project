import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const origin = process.env.WEBSITE_URL || 'http://127.0.0.1:3000'
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  page.setDefaultTimeout(120000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin + '/reports')
  await page.waitForFunction(() => document.querySelectorAll('form button[type="button"]').length >= 2)
  const ids = await page.$$eval('form button[type="button"]', buttons => buttons.slice(0, 2).map(b => b.textContent))
  for (const id of ids) {
    await page.$eval('input', (input) => input.select())
    await page.type('form input', id)
    await page.keyboard.press('Enter')
    await page.waitForFunction(id => document.querySelector('[aria-live] h2')?.textContent.startsWith('Sample ' + id + ' ·'), {}, id)
  }
  await page.goto(origin + '/analyze')
  assert.equal(await page.$$eval('select', els => els[1].value), 'adam_workflow')
  await page.goto(origin + '/assistant')
  await page.waitForSelector('textarea[aria-label="Research question"], input[aria-label="Research question"]')
  const inputSelector = await page.$('textarea[aria-label="Research question"]') ? 'textarea[aria-label="Research question"]' : 'input[aria-label="Research question"]'
  await page.type(inputSelector, 'butyrate')
  await page.keyboard.press('Enter')
  await page.waitForSelector('a[href^="https://pubmed.ncbi.nlm.nih.gov/"]')
  await page.goto(origin + '/research?tab=linkage')
  await page.waitForFunction(() => document.body.innerText.includes('Duplicate sample ID rows'))
  assert.deepEqual(errors, [])
  console.log('Report switch, Studio default, AIRA citation and integrity panel passed.')
} finally { await browser.close() }
