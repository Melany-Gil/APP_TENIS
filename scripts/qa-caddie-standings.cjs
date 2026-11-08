const {chromium}=require('playwright')
const assert=require('node:assert/strict')
;(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true})
  try {
    for(const width of [320,390,1440]) {
      const page=await browser.newPage({viewport:{width,height:900}})
      const errors=[]
      page.on('pageerror',e=>errors.push(e.message))
      const user={id:99,rol:'admin',nombre:'QA',email:'qa@example.com',numero_documento:'12345678'}
      await page.addInitScript(user=>localStorage.setItem('auth-storage-v2',JSON.stringify({state:{isAuthenticated:true,user},version:0})),user)
      await page.route('**/*',route=>{
        const url=new URL(route.request().url()),ep=url.pathname.replace(/^\/api/,'')
        if(!url.pathname.startsWith('/api/'))return url.hostname==='127.0.0.1'?route.continue():route.abort()
        let data=[]
        if(ep.endsWith('/me'))data=user
        if(ep==='/caddies/valoraciones')data={items:[],page:1,more:false}
        if(ep==='/caddies/posiciones')data={alcance:'global',votos:10,items:[{id:1,nombre:'Caddie de prueba',posicion:1,promedio:4.8,votos:10,partidos:3,evaluadores:8,positivas:100,estrellas:[0,0,0,2,8],promedio_jueces:5,promedio_jugadores:4.75,votos_jueces:2,votos_jugadores:8}]}
        return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,data})})
      })
      await page.goto('http://127.0.0.1:4173/admin/caddies')
      await page.getByText('Mejor calificado',{exact:true}).waitFor()
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
      await page.getByRole('button',{name:'Ver más detalles de Caddie de prueba'}).click()
      const dialog=page.getByRole('dialog',{name:'Resumen de Caddie de prueba'})
      await dialog.waitFor()
      await dialog.getByRole('heading',{name:'Distribución de estrellas'}).waitFor()
      assert.equal(await dialog.getByRole('progressbar').count(),5)
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
      assert.deepEqual(errors,[])
      console.log(`PASS caddie standings and detail ${width}px`)
      await page.close()
    }
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
