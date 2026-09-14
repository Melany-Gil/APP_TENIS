const { chromium } = require(process.argv[2] || 'playwright')
const assert = require('node:assert/strict')
const base = 'http://127.0.0.1:4175'
;(async()=>{
  const browser = await chromium.launch({channel:'chrome',headless:true})
  try {
    for(const width of [360,1366]) {
      const page = await browser.newPage({viewport:{width,height:850}})
      const errors = [], deleted = []
      page.on('pageerror',e=>errors.push(e.message))
      await page.addInitScript(()=>localStorage.setItem('auth-storage-v2',JSON.stringify({state:{isAuthenticated:true,user:{id:3,rol:'admin',nombre:'QA',email:'qa@example.com',numero_documento:'1234567'}},version:0})))
      let tournaments = [1,2].map(id=>({id,nombre:`Torneo ${id}`,deporte:'tenis',modalidad:'dobles',sistema:'grupos_eliminacion',estado:'en_curso',partidos_count:4,inscripciones_count:3}))
      await page.route('**/*',route=>{
        const u=new URL(route.request().url())
        if(!u.pathname.startsWith('/api/')) return u.origin===base?route.continue():route.abort()
        let data=[]
        if(u.pathname==='/api/torneos') data=tournaments
        if(u.pathname==='/api/notificaciones') data={items:[],pendientes:0}
        if(route.request().method()==='DELETE') {
          assert.ok(u.pathname.startsWith('/api/torneos/'))
          const id=Number(u.pathname.split('/').at(-1))
          if(id===2) return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({ok:false,message:'Conflicto simulado'})})
          deleted.push(id);tournaments=tournaments.filter(t=>t.id!==id)
        }
        return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,data})})
      })
      await page.goto(base+'/admin/torneos')
      await page.getByText('Selección múltiple · 0 seleccionados',{exact:true}).click()
      await page.getByRole('button',{name:'Seleccionar visibles (2)',exact:true}).click()
      await page.getByRole('button',{name:'Eliminar seleccionados (2)',exact:true}).click()
      const dialog=page.getByRole('dialog')
      assert.ok((await dialog.innerText()).includes('Se conservan jugadores'))
      const submit=dialog.getByRole('button',{name:'Eliminar seleccionados',exact:true})
      assert.equal(await submit.isEnabled(),false)
      await dialog.getByPlaceholder('ELIMINAR',{exact:true}).fill('ELIMINAR')
      await submit.click()
      await page.getByText('1 eliminados · 1 no eliminados.',{exact:true}).waitFor()
      assert.deepEqual(deleted,[1])
      await page.getByText('Torneo 2: Conflicto simulado',{exact:true}).waitFor()
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
      assert.deepEqual(errors,[])
      console.log(`Selección múltiple, confirmación y error parcial OK: ${width}px`)
      await page.close()
    }
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
