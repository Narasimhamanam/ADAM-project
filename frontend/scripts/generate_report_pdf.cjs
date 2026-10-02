const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  const outputDir = path.resolve(__dirname, '../../reports_output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pdfPath = path.join(outputDir, 'adam1_report_fb100.pdf');

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to http://localhost:5173/reports ...');
  await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for patient dossier container to be populated
  console.log('Waiting for patient dossier to render...');
  await page.waitForSelector('.patient-dossier-report', { timeout: 15000 });

  // Wait an extra 2 seconds for any charts, animations or fonts to stabilize
  await new Promise((r) => setTimeout(r, 2000));

  console.log('Generating A4 PDF with exact print backgrounds, institutional headers & dynamic page numbering...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '16mm',
      right: '12mm',
      bottom: '16mm',
      left: '12mm',
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 8px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 12mm; margin-bottom: 2mm; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
        <span style="font-weight: 700; color: #0f172a; letter-spacing: 0.02em;">ADAM-1 Enhanced &bull; Multimodal Alzheimer’s &amp; Microbiome Research</span>
        <span style="font-weight: 600; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase;">RESEARCH USE ONLY &bull; NOT FOR CLINICAL DIAGNOSIS</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 8px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 12mm; margin-top: 2mm; border-top: 1px solid #e2e8f0; padding-top: 3px;">
        <span>Research Use Only &bull; Sample: FB100 &bull; Protocol: ADAM-1 IEEE Access (2025)</span>
        <span style="font-weight: 600; color: #0f172a;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
  });

  console.log(`PDF successfully saved to: ${pdfPath}`);
  await browser.close();
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
