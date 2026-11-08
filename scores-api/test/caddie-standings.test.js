const test=require('node:test')
const assert=require('node:assert/strict')
const {standings}=require('../src/modules/caddies/standings')
const admin={id:1,rol:'admin'}
const row=(id,nombre,votos,puntos)=>({id,nombre,votos:String(votos),puntos:String(puntos),partidos:'2',evaluadores:'3',e1:'0',e2:'0',e3:'0',e4:'1',e5:'3',votos_jueces:'1',votos_jugadores:'3',promedio_jueces:'5',promedio_jugadores:'4.6667'})
test('caddies: ranking uses all ratings, exact averages, vote-count tie breaker and shared places',async()=>{
  let sql
  const db={query:async q=>{sql=q;return [[row(1,'Ana',4,19),row(2,'Luis',2,10),row(3,'Sara',4,20),row(4,'Juan',4,20)]]}}
  const result=await standings(db,{},admin)
  assert.deepEqual(result.items.map(r=>[r.nombre,r.posicion]),[['Juan',1],['Sara',1],['Luis',3],['Ana',4]])
  assert.equal(result.votos,14)
  assert.equal(result.items[3].promedio,4.75)
  assert.equal(result.items[3].positivas,100)
  assert.deepEqual(result.items[3].estrellas,[0,0,0,1,3])
  assert.match(sql,/COUNT\(DISTINCT v.user_id\)/)
  assert.match(sql,/p.estado='finalizado'/)
  assert.doesNotMatch(sql,/LIMIT/)
  assert.doesNotMatch(JSON.stringify(result),/user_id|comentario/)
})
test('caddies: date filters and assigned judge scope are enforced server-side',async()=>{
  let call
  const db={query:async(sql,args)=>{call={sql,args};return [[]]}}
  const result=await standings(db,{desde:'2026-10-01',hasta:'2026-10-31'},{id:8,rol:'juez'})
  assert.match(call.sql,/p.juez_id=\?/)
  assert.deepEqual(call.args,[8,'2026-10-01','2026-10-31'])
  assert.equal(result.alcance,'partidos_asignados')
  assert.deepEqual(result.items,[])
  await standings(db,{}, {id:9,rol:'juez_director'})
  assert.doesNotMatch(call.sql,/p.juez_id=/)
})
test('caddies: rejects unauthorized access and invalid date ranges before querying',async()=>{
  const db={query:async()=>{throw Error('Unexpected query')}}
  for(const user of [null,{rol:'miembro'}]) await assert.rejects(standings(db,{},user),e=>e.status===403)
  for(const query of [{desde:'2026-02-30'},{hasta:'bad'},{desde:'2026-11-02',hasta:'2026-11-01'}]) await assert.rejects(standings(db,query,admin),e=>e.status===400)
})
