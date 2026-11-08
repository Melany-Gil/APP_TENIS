const test=require('node:test')
const assert=require('node:assert/strict')
const {standings}=require('../src/modules/caddies/standings')
const admin={id:1,rol:'admin'}
const row=(id,nombre,votos,puntos)=>({id,nombre,votos:String(votos),puntos:String(puntos),partidos:'2',evaluadores:'3',e1:'0',e2:'0',e3:'0',e4:'1',e5:'3',votos_jueces:'1',votos_jugadores:'3',promedio_jueces:'5',promedio_jugadores:'4.6667'})
test('caddies: ranking uses all ratings, exact averages, vote-count tie breaker and shared places',async()=>{
  let sql
  const db={query:async q=>{sql=q;return [[row(1,'Ana',4,19),row(2,'Luis',2,10),row(3,'Sara',4,20),row(4,'Juan',4,20)]]}}
  const result=await standings(db,{},admin)
  assert.deepEqual(result.items.map(r=>[r.nombre,r.posicion]),[['Juan',1],['Sara',1],['Ana',3],['Luis',4]])
  assert.equal(result.votos,14)
  assert.equal(result.items[2].promedio,4.75)
  assert.equal(result.items[2].positivas,100)
  assert.deepEqual(result.items[2].estrellas,[0,0,0,1,3])
  assert.match(sql,/COUNT\(DISTINCT v.user_id\)/)
  assert.match(sql,/p.estado='finalizado'/)
  assert.doesNotMatch(sql,/LIMIT/)
  assert.doesNotMatch(JSON.stringify(result),/user_id|comentario/)
})

test('caddies: a single five-star rating does not beat ten ratings averaging four',async()=>{
  const rows=[{...row(1,'Una',1,5),votos_jueces:0,puntos_jueces:0,promedio_jueces:null,votos_jugadores:1,puntos_jugadores:5,promedio_jugadores:5},
    {...row(2,'Diez',10,40),votos_jueces:2,puntos_jueces:10,promedio_jueces:5,votos_jugadores:8,puntos_jugadores:30,promedio_jugadores:3.75}]
  const result=await standings({query:async()=>[rows]}, {},admin)
  assert.equal(result.items[0].nombre,'Diez')
  assert.equal(result.items[0].puntaje_ajustado,55/15)
  assert.equal(result.items[1].puntaje_ajustado,20/6)
  assert.equal(result.items[0].puntaje_jueces,25/7)
  assert.equal(result.items[0].puntaje_jugadores,45/13)
  assert.equal(result.items[1].puntaje_jueces,null)
  assert.equal(result.items[0].puntos_jueces+result.items[0].puntos_jugadores,result.items[0].puntos)
  assert.equal(result.items[0].votos_jueces+result.items[0].votos_jugadores,result.items[0].votos)
  assert.deepEqual(result.metodo,{version:'ponderado-v1',referencia:3,peso:5})
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
