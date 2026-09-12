const { chromium } = require(process.argv[2] || 'playwright')
const assert = require('node:assert/strict')
const base='http://127.0.0.1:4175'
;(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true})
 try {
  for(const role of ['miembro','juez']) for(const width of [360,1366]) {
   const page=await browser.newPage({viewport:{width,height:950}}),errors=[]
   page.on('pageerror',e=>errors.push(e.message))
   await page.addInitScript(role=>localStorage.setItem('auth-storage-v2',JSON.stringify({state:{isAuthenticated:true,user:{id:3,rol:role,nombre:'Prueba',apellido:'Local',email:'test@example.com',numero_documento:'12345678'}},version:0})),role)
   await page.route('**/*',route=>{
    const url=new URL(route.request().url())
    if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,data:url.pathname==='/api/notificaciones'?{items:[],pendientes:0}:[]})})
    return url.origin===base?route.continue():route.abort()
   })
   await page.goto(base+'/ayuda')
   await page.getByRole('heading',{name:/Más juego/}).waitFor()
   const ball=page.locator('.help-orbit-ball')
   const before=await ball.evaluate(e=>getComputedStyle(e).transform)
   await page.waitForTimeout(200)
   assert.notEqual(await ball.evaluate(e=>getComputedStyle(e).transform),before)
   await page.getByRole('button',{name:'Pausar animaciones',exact:true}).click()
   assert.equal(await ball.evaluate(e=>getComputedStyle(e).animationPlayState),'paused')
   const guide=await page.locator('.help-guide').innerText()
   assert.doesNotMatch(guide,/foto de la malla|foto de inicio y de final|BREAK POINT/)
   if(role==='juez'){
    assert.match(guide,/una sola foto/)
    await page.getByRole('link',{name:'8 · Soporte y avisos'}).click()
    await page.getByRole('heading',{name:'Soporte y notificaciones',exact:true}).waitFor()
    assert.equal(await page.locator('a[href="/sponsors"]').count(),0)
   }else{
    await page.getByText('¿Cómo leo las estadísticas?',{exact:true}).click()
    assert.equal(await page.locator('details[open]').count(),1)
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
   await page.evaluate(()=>window.scrollTo(0,0))
   await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),`help-${role}-${width}.png`)})
   await page.emulateMedia({reducedMotion:'reduce'})
   assert.equal(await ball.evaluate(e=>getComputedStyle(e).animationName),'none')
   await page.getByRole('button',{name:'Activar animaciones',exact:true}).click()
   assert.equal(await ball.evaluate(e=>getComputedStyle(e).animationName),'none')
   assert.deepEqual(errors,[])
   console.log(`Ayuda, contenido, navegación y movimiento OK: ${role} ${width}px`)
   await page.close()
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
