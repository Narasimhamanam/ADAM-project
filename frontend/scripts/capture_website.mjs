import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
const destination = process.argv[2]
await mkdir(destination, {recursive:true})
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-gpu']})
try {
  const page = await browser.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  let simulateFailure=false
  if(process.env.CAPTURE_BUNDLE) {
    const bundle=path.resolve(process.env.CAPTURE_BUNDLE)
    const fixtures=JSON.parse(await readFile(process.env.CAPTURE_RESPONSES,'utf8'))
    await page.setRequestInterception(true)
    page.on('request',async request=>{
      const url=new URL(request.url())
      if(url.pathname.startsWith('/api/')) {
        let key=url.pathname+url.search
        if(url.pathname==='/api/ml/predict'){const body=JSON.parse(request.postData());key+=':'+body.sample_id+':'+body.model_name}
        if(key==='/api/ai/answers/stream'){
          if(simulateFailure)return request.respond({status:503,body:'Unavailable'})
          await new Promise(resolve=>setTimeout(resolve,800))
        }
        const fixture=fixtures[key]
        return request.respond({status:fixture?.status||404,contentType:fixture?.mime||'application/json',body:fixture?.binary?Buffer.from(fixture.body,'base64'):typeof fixture?.body==='string'?fixture.body:JSON.stringify(fixture?.body||{detail:'No captured response'})})
      }
      const file=url.pathname.includes('.')?url.pathname.slice(1):'index.html'
      const target=path.resolve(bundle,file)
      if(!target.startsWith(bundle+path.sep))return request.abort()
      try {
        const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'}
        await request.respond({status:200,contentType:mime[path.extname(file)],body:await readFile(target)})
      } catch {await request.abort()}
    })
  }
  for(const [device,width,height] of [['desktop',1440,960],['mobile',360,800]]) {
    await page.setViewport({width,height})
    for(const theme of ['light','dark']) {
      await page.goto('http://127.0.0.1:3192')
      await page.evaluate(t=>localStorage.setItem('adam_theme',t),theme)
      for(const route of ['overview','analyze','patients','assistant','research','reports','rigor','settings']) {
        await page.goto('http://127.0.0.1:3192/'+route,{waitUntil:'domcontentloaded'})
        await page.waitForSelector('main')
        await page.evaluate(()=>document.fonts.ready)
        await new Promise(r=>setTimeout(r,400))
        await page.screenshot({path:path.join(destination,device+'-'+theme+'-'+route+'.png')})
      }
    }
  }
  if(process.env.CHECK_INTERACTIONS){
    await page.setViewport({width:1440,height:960})
    await page.goto('http://127.0.0.1:3192/overview')
    const routes=['/overview','/analyze','/patients','/assistant','/research','/reports','/rigor']
    assert.deepEqual(await page.$$eval('nav a',a=>a.map(x=>x.pathname)),routes)
    for(const route of routes){
      await page.click('nav a[href="'+route+'"]')
      await page.waitForFunction(p=>location.pathname===p,{},route)
      assert.equal(await page.$eval('nav a[aria-current="page"]',a=>a.pathname),route)
    }
    await page.click('nav a[href="/reports"]')
    await page.waitForSelector('form button[type=button]')
    const ids=await page.$$eval('form button[type=button]',b=>b.slice(0,2).map(x=>x.textContent))
    assert.equal(ids.length,2)
    for(const id of ids){
      await page.$eval('form input',i=>i.select());await page.type('form input',id);await page.keyboard.press('Enter')
      await page.waitForFunction(id=>document.querySelector('[aria-live] h2')?.textContent.includes('Sample '+id+' '),{},id)
      const result=page.waitForResponse(r=>r.url().includes('/reports/'+id+'?format=pdf'))
      await page.click('.export-actions button')
      assert.equal((await (await result).buffer()).subarray(0,4).toString(),'%PDF')
    }
    await page.click('nav a[href="/overview"]')
    await page.evaluate(()=>sessionStorage.removeItem('aira-greeted'))
    await page.reload()
    const snap=async state=>{await page.screenshot({path:path.join(destination,'avatar-'+state+'.png')})}
    await page.waitForSelector('.aira-launch');await snap('greeting')
    await page.click('.aira-launch');await page.waitForSelector('dialog[open]');await snap('idle')
    const question='Which study examined butyrate and amyloid burden?'
    await page.type('dialog textarea',question);await snap('listening')
    await page.keyboard.press('Enter');await page.waitForSelector('[data-state=thinking]');await snap('thinking')
    await page.waitForSelector('.bubble.assistant details');await snap('answering')
    await page.click('a[href="/assistant"]:not(nav a)')
    await page.waitForSelector('.evidence-list a')
    assert.ok(await page.$eval('.bubble.assistant',el=>el.textContent.includes('Research use only')))
    assert.ok(await page.$eval('.bubble.user',el=>el.textContent.includes('butyrate')))
    simulateFailure=true
    await page.type('.composer textarea','retry test');await page.keyboard.press('Enter')
    await page.waitForSelector('.bubble.error');await snap('error')
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
    await page.waitForFunction(()=>!document.querySelector('.aira-orb canvas'))
    assert.deepEqual(errors,[])
    console.log('Browser checks passed: sidebar order and seven routes, two report IDs and PDF responses, chat stages, continuity, citation links, refusal of unavailable service, reduced motion.')
  }
} finally { await browser.close() }
