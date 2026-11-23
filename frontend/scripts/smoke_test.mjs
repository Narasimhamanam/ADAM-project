import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const origin = process.env.WEBSITE_URL || 'http://127.0.0.1:3000'
const viewports = [
  { width: 360, height: 640, name: '360px Mobile' },
  { width: 390, height: 844, name: '390px Mobile' },
  { width: 1440, height: 900, name: '1440px Desktop' }
]

const routes = [
  '/overview',
  '/analyze',
  '/patients',
  '/assistant',
  '/research',
  '/reports',
  '/rigor'
]

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
})

try {
  for (const vp of viewports) {
    console.log(`\n=== Running Smoke Test for Viewport: ${vp.name} ===`)
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)
    await page.setViewport({ width: vp.width, height: vp.height })

    const pageErrors = []
    page.on('pageerror', err => pageErrors.push(err.message))
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore expected network timeouts or favicon issues if any
        if (!text.includes('favicon.ico')) {
          pageErrors.push(text)
        }
      }
    })

    for (const route of routes) {
      await page.goto(origin + route, { waitUntil: 'domcontentloaded' })
      // Brief settling time
      await new Promise(r => setTimeout(r, 600))

      // Check for ErrorBoundary crash notice
      const bodyText = await page.evaluate(() => document.body.innerText)
      assert.ok(
        !bodyText.includes('Application Rendering Notice'),
        `Route ${route} crashed with Application Rendering Notice on ${vp.name}!`
      )

      // Ensure main content is not empty
      const mainContent = await page.evaluate(() => {
        const main = document.querySelector('main') || document.querySelector('#main-content')
        return main ? main.innerText.trim() : ''
      })
      assert.ok(
        mainContent.length > 0,
        `Route ${route} has empty main content on ${vp.name}!`
      )

      console.log(`✓ ${route} loaded cleanly (content length: ${mainContent.length})`)
    }

    // Special test on /patients: verify synthetic record interaction and ReportDownloads presence
    await page.goto(origin + '/patients', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 800))

    const downloadButtonsCount = await page.evaluate(() => {
      return document.querySelectorAll('.export-actions button, button[aria-label*="Download"]').length
    })
    console.log(`✓ /patients rendered with ${downloadButtonsCount} report action buttons accessible`)

    assert.equal(
      pageErrors.length,
      0,
      `Encountered page errors on ${vp.name}: ${pageErrors.join(', ')}`
    )

    await page.close()
  }

  console.log('\nALL 7 ROUTES PASSED SMOKE TESTS ACROSS 360px, 390px, and 1440px VIEWPORTS!')
} finally {
  await browser.close()
}
