import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import assert from 'node:assert/strict'
import { writeFile, mkdir } from 'node:fs/promises'

const origin=process.env.WEBSITE_URL || 'http://127.0.0.1:3000'
const browser=await chromium.launch({args:['--no-sandbox']})
const audit=[]
try{
  for(const width of [1440,360]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'})
    const consoleErrors=[]
    page.on('pageerror',e=>consoleErrors.push(e.message))
    for(const theme of ['light','dark']){
      await page.addInitScript(t=>localStorage.setItem('adam_theme',t),theme)
      for(const route of ['overview','analyze','patients','assistant','research','reports','rigor','settings']){
        await page.goto(origin+'/'+route)
        await page.locator('#main-content').waitFor()
        assert.equal(await page.locator('html').getAttribute('data-theme'),theme)
        const findings=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
        audit.push({route,width,theme,violations:findings.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))})
      }
    }
    await page.goto(origin+'/overview')
    await page.getByRole('button',{name:/Ask AIRA/}).click()
    await page.getByRole('textbox',{name:'Research question'}).fill('Which study examined butyrate and amyloid burden?')
    await page.getByRole('button',{name:'Send',exact:true}).click()
    await page.locator('.bubble.assistant details').first().waitFor()
    await page.getByRole('link',{name:'Expand AIRA'}).click()
    assert.ok((await page.locator('.bubble.user').textContent()).includes('butyrate'))
    assert.equal(await page.locator('.aira-orb canvas').count(),0)
    assert.deepEqual(consoleErrors,[])
    await page.close()
  }
}finally{
  await mkdir('audit-output',{recursive:true})
  await writeFile('audit-output/axe.json',JSON.stringify(audit,null,2))
  await browser.close()
}
assert.equal(audit.filter(r=>r.violations.length).length,0,'Accessibility violations are listed in audit-output/axe.json')
