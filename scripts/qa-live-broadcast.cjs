const { chromium } = require('playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true})
  try {
    for (const width of [320,390,1440]) {
      const page = await browser.newPage({viewport:{width,height:900}})
      const errors = [], requests = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.href === 'https://player.twitch.tv/js/embed/v1.js') return route.fulfill({contentType:'application/javascript',body:`
          class Player {
            static ONLINE='online'; static OFFLINE='offline'; static PLAYING='playing';
            constructor(id, options) { window.__player=this; window.__options=options; this.events={}; const frame=document.createElement('iframe'); frame.src='about:blank'; document.getElementById(id).append(frame); setTimeout(()=>this.emit('offline'),50) }
            addEventListener(e,f) { this.events[e]=f } removeEventListener(e) { delete this.events[e] } pause() {} emit(e) { this.events[e]?.() }
          } window.Twitch={Player};`})
        if (url.pathname.startsWith('/api/')) { requests.push(url); return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,data:[]})}) }
        return url.hostname === '127.0.0.1' ? route.continue() : route.abort()
      })
      await page.goto('http://127.0.0.1:4173/live')
      await page.getByText('Canal desconectado',{exact:true}).waitFor()
      await page.getByText('No hay partidos registrados para hoy.',{exact:true}).waitFor()
      assert.equal(await page.evaluate(()=>window.__options.channel),'legalbranding')
      assert.deepEqual(await page.evaluate(()=>window.__options.parent),['127.0.0.1'])
      assert.ok(requests.some(u=>u.pathname==='/api/partidos' && /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('fecha')||'')))
      await page.evaluate(()=>window.__player.emit('online'))
      await page.getByRole('heading',{name:'En directo desde el club'}).waitFor()
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
      await page.evaluate(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Unsupported'))})
      await page.getByRole('button',{name:'Ampliar transmisión y jornada'}).click()
      await page.getByRole('button',{name:'Salir de pantalla completa'}).waitFor()
      assert.equal(await page.locator('.broadcast-expanded').count(),1)
      await page.keyboard.press('Escape')
      await page.getByRole('button',{name:'Ampliar transmisión y jornada'}).waitFor()
      await page.evaluate(()=>window.__player.emit('offline'))
      await page.getByText('Canal desconectado',{exact:true}).waitFor()
      await page.getByRole('button',{name:'Resultados',exact:true}).click()
      await page.getByText('Todavía no hay resultados de hoy.',{exact:true}).waitFor()
      assert.deepEqual(errors,[])
      console.log(`PASS broadcast ${width}px: offline/online, date, no overflow, expanded mobile fallback, filters`)
      await page.close()
    }
  } finally { await browser.close() }
})().catch(e=>{console.error(e);process.exitCode=1})
