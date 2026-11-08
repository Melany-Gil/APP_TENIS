const fail = (status, message) => { throw { status, message } }
exports.standings = async (db, query, user) => {
  if (!['admin','juez_director','juez'].includes(user?.rol)) fail(403,'No tienes permiso para consultar valoraciones')
  const global = ['admin','juez_director'].includes(user.rol)
  const where = ["p.estado='finalizado'"], args = []
  if (!global) { where.push('p.juez_id=?'); args.push(user.id) }
  for (const [key, operator] of [['desde','>='],['hasta','<=']]) {
    if (!query[key]) continue
    const value = String(query[key])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) fail(400,'Fecha inválida')
    where.push(`p.fecha_inicio ${operator} ?`); args.push(value)
  }
  if (query.desde && query.hasta && query.desde > query.hasta) fail(400,'Revisa el rango de fechas')
  const [rows] = await db.query(`SELECT c.id,c.nombre,
    COUNT(*) AS votos,SUM(v.estrellas) AS puntos,COUNT(DISTINCT v.partido_id) AS partidos,
    COUNT(DISTINCT v.user_id) AS evaluadores,
    SUM(v.estrellas=1) AS e1,SUM(v.estrellas=2) AS e2,SUM(v.estrellas=3) AS e3,
    SUM(v.estrellas=4) AS e4,SUM(v.estrellas=5) AS e5,
    SUM(v.tipo='juez') AS votos_jueces,SUM(v.tipo='jugador') AS votos_jugadores,
    AVG(CASE WHEN v.tipo='juez' THEN v.estrellas END) AS promedio_jueces,
    AVG(CASE WHEN v.tipo='jugador' THEN v.estrellas END) AS promedio_jugadores
    FROM caddie_valoraciones v JOIN caddies c ON c.id=v.caddie_id
    JOIN partidos p ON p.id=v.partido_id
    WHERE ${where.join(' AND ')} GROUP BY c.id,c.nombre`,args)
  const items = rows.map(r=>({id:Number(r.id),nombre:r.nombre,
    votos:Number(r.votos),puntos:Number(r.puntos),partidos:Number(r.partidos),evaluadores:Number(r.evaluadores),
    promedio:Number(r.puntos)/Number(r.votos),positivas:100*(Number(r.e4)+Number(r.e5))/Number(r.votos),
    estrellas:[1,2,3,4,5].map(n=>Number(r[`e${n}`])),
    votos_jueces:Number(r.votos_jueces),votos_jugadores:Number(r.votos_jugadores),
    promedio_jueces:r.promedio_jueces == null ? null : Number(r.promedio_jueces),
    promedio_jugadores:r.promedio_jugadores == null ? null : Number(r.promedio_jugadores),
  })).sort((a,b)=>b.promedio-a.promedio || b.votos-a.votos || a.nombre.localeCompare(b.nombre,'es'))
  items.forEach((item,i)=>{
    const previous=items[i-1]
    item.posicion=previous && item.puntos===previous.puntos && item.votos===previous.votos ? previous.posicion : i+1
  })
  return {items,alcance:global?'global':'partidos_asignados',votos:items.reduce((sum,r)=>sum+r.votos,0)}
}
