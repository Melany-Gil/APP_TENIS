const db = require('../../config/db')
const { createHash } = require('node:crypto')
const revision = (groups, pairs) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        groups: groups.map((g) => [Number(g.categoria_id), g.nombre]).sort(),
        pairs: pairs
          .map((p) => [Number(p.equipo_id), Number(p.categoria_id), p.grupo])
          .sort((a, b) => a[0] - b[0]),
      })
    )
    .digest('hex')
exports.revision = revision
const fail = (message, status = 409) => {
  throw { status, message }
}
const key = (c, g) =>
  `${Number(c)}:${String(g || '')
    .trim()
    .toLocaleLowerCase('es')}`
exports.groupKey = key
exports.isCompatible = (match, assignments) => {
  const a = assignments.get(Number(match.equipo1_id)),
    b = assignments.get(Number(match.equipo2_id))
  return Boolean(
    a &&
    b &&
    key(a.categoria_id, a.grupo) === key(match.categoria_id, match.grupo) &&
    key(b.categoria_id, b.grupo) === key(match.categoria_id, match.grupo)
  )
}
exports.get = async (id, conn = db) => {
  const [grupos] = await conn.query(
    'SELECT categoria_id,nombre FROM torneo_grupos WHERE torneo_id=? ORDER BY categoria_id,nombre',
    [id]
  )
  const [parejas] = await conn.query(
    "SELECT gp.equipo_id,gp.categoria_id,gp.grupo FROM torneo_grupo_parejas gp WHERE gp.torneo_id=? AND EXISTS (SELECT 1 FROM inscripciones i WHERE i.torneo_id=gp.torneo_id AND i.equipo_id=gp.equipo_id AND i.estado<>'eliminado')",
    [id]
  )
  const [matches] = await conn.query(
    "SELECT id,categoria_id,grupo,equipo1_id,equipo2_id FROM partidos WHERE torneo_id=? AND fase='grupos' AND estado<>'cancelado'",
    [id]
  )
  const map = new Map(parejas.map((p) => [Number(p.equipo_id), p]))
  const [versionPairs] = await conn.query(
    'SELECT equipo_id,categoria_id,grupo FROM torneo_grupo_parejas WHERE torneo_id=?',
    [id]
  )
  const seenMatches = new Map(),
    duplicateIds = new Set()
  for (const m of matches) {
    if (!m.equipo1_id || !m.equipo2_id) continue
    const pair = [Number(m.equipo1_id), Number(m.equipo2_id)].sort((a, b) => a - b).join(':')
    if (seenMatches.has(pair)) {
      duplicateIds.add(seenMatches.get(pair))
      duplicateIds.add(m.id)
    } else seenMatches.set(pair, m.id)
  }
  return {
    version: revision(grupos, versionPairs),
    grupos: grupos.map((g) => ({
      ...g,
      equipo_ids: parejas
        .filter((p) => key(p.categoria_id, p.grupo) === key(g.categoria_id, g.nombre))
        .map((p) => Number(p.equipo_id)),
    })),
    parejas,
    incidencias: matches
      .filter((m) => duplicateIds.has(m.id) || !exports.isCompatible(m, map))
      .map((m) => ({
        partido_id: m.id,
        message: duplicateIds.has(m.id)
          ? 'Cruce repetido: revisa los partidos antes de incluirlo en posiciones.'
          : 'Los participantes, la categoría o el grupo del partido no coinciden con la distribución.',
      })),
  }
}
exports.save = async (id, groups, expectedVersion) => {
  if (!Array.isArray(groups) || groups.length > 200) fail('Envía hasta 200 grupos', 400)
  const seen = new Set(),
    teams = new Set()
  const normalized = groups.map((g) => {
    const nombre = String(g.nombre || '')
        .trim()
        .replace(/\s+/g, ' '),
      categoria_id = Number(g.categoria_id)
    if (
      !nombre ||
      nombre.length > 20 ||
      !Number.isSafeInteger(categoria_id) ||
      categoria_id < 1 ||
      !Array.isArray(g.equipo_ids)
    )
      fail('Categoría, nombre de grupo o parejas inválidos', 400)
    if (seen.has(key(categoria_id, nombre))) fail('Hay grupos repetidos en una categoría', 400)
    seen.add(key(categoria_id, nombre))
    const equipo_ids = g.equipo_ids.map(Number)
    for (const team of equipo_ids) {
      if (!Number.isSafeInteger(team) || team < 1 || teams.has(team))
        fail('Una pareja solo puede pertenecer a un grupo del torneo', 400)
      teams.add(team)
    }
    return { nombre, categoria_id, equipo_ids }
  })
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [[t]] = await conn.query(
      'SELECT id,deporte,modalidad,sistema,estado FROM torneos WHERE id=? FOR UPDATE',
      [id]
    )
    if (!t) fail('Torneo no encontrado', 404)
    if (t.modalidad !== 'dobles' || t.sistema !== 'grupos_eliminacion')
      fail('Esta distribución requiere un torneo de dobles con fase de grupos')
    if (['finalizado', 'cancelado'].includes(t.estado)) fail('El torneo está cerrado')
    const [cats] = await conn.query("SELECT id FROM categorias WHERE deporte IN (?, 'ambos')", [
      t.deporte,
    ])
    if (normalized.some((g) => !cats.some((c) => Number(c.id) === g.categoria_id)))
      fail('Categoría ajena al deporte', 400)
    const [enrolled] = await conn.query(
      "SELECT i.equipo_id FROM inscripciones i JOIN equipos_padel e ON e.id=i.equipo_id WHERE i.torneo_id=? AND i.estado<>'eliminado' AND e.activo=1 AND e.deporte=? FOR UPDATE",
      [id, t.deporte]
    )
    if ([...teams].some((team) => !enrolled.some((e) => Number(e.equipo_id) === team)))
      fail('Solo se pueden distribuir parejas activas e inscritas en este torneo')
    const [old] = await conn.query(
      'SELECT equipo_id,categoria_id,grupo FROM torneo_grupo_parejas WHERE torneo_id=?',
      [id]
    )
    const [oldGroups] = await conn.query(
      'SELECT categoria_id,nombre FROM torneo_grupos WHERE torneo_id=?',
      [id]
    )
    if (expectedVersion !== revision(oldGroups, old))
      fail('La distribución cambió. Actualiza la página y revisa los grupos antes de guardar.')
    const before = new Map(old.map((p) => [Number(p.equipo_id), p])),
      after = new Map()
    normalized.forEach((g) =>
      g.equipo_ids.forEach((e) => after.set(e, { categoria_id: g.categoria_id, grupo: g.nombre }))
    )
    const [matches] = await conn.query(
      "SELECT id,categoria_id,grupo,equipo1_id,equipo2_id FROM partidos WHERE torneo_id=? AND fase='grupos' AND estado<>'cancelado' FOR UPDATE",
      [id]
    )
    const conflicts = matches.filter(
      (m) => exports.isCompatible(m, before) && !exports.isCompatible(m, after)
    )
    if (conflicts.length)
      fail(
        `La redistribución alteraría los partidos ${conflicts.map((m) => m.id).join(', ')}. Corrige o cancela esos encuentros primero.`
      )
    await conn.query('DELETE FROM torneo_grupo_parejas WHERE torneo_id=?', [id])
    await conn.query('DELETE FROM torneo_grupos WHERE torneo_id=?', [id])
    for (const g of normalized) {
      await conn.query('INSERT INTO torneo_grupos (torneo_id,categoria_id,nombre) VALUES (?,?,?)', [
        id,
        g.categoria_id,
        g.nombre,
      ])
      for (const e of g.equipo_ids)
        await conn.query(
          'INSERT INTO torneo_grupo_parejas (torneo_id,equipo_id,categoria_id,grupo) VALUES (?,?,?,?)',
          [id, e, g.categoria_id, g.nombre]
        )
    }
    await conn.commit()
    return exports.get(id)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
exports.validateMatch = async (match, conn = db) => {
  if (!match.torneo_id || (!match.equipo1_id && !match.equipo2_id)) return
  const [[t]] = await conn.query('SELECT sistema FROM torneos WHERE id=?', [match.torneo_id])
  if (t?.sistema !== 'grupos_eliminacion') return
  const [rows] = await conn.query(
    "SELECT gp.equipo_id,gp.categoria_id,gp.grupo FROM torneo_grupo_parejas gp WHERE gp.torneo_id=? AND EXISTS (SELECT 1 FROM inscripciones i WHERE i.torneo_id=gp.torneo_id AND i.equipo_id=gp.equipo_id AND i.estado<>'eliminado')",
    [match.torneo_id]
  )
  const map = new Map(rows.map((p) => [Number(p.equipo_id), p]))
  if (match.fase === 'grupos') {
    if (match.origen_partido1_id || match.origen_partido2_id)
      fail('En grupos selecciona parejas inscritas, no ganadores de otros partidos')
    if (!exports.isCompatible(match, map))
      fail(
        'Las dos parejas deben estar asignadas a esta categoría y al mismo grupo. Organiza los grupos del torneo antes de crear el cruce.'
      )
    const [teams] = await conn.query(
      'SELECT jugador1_id,jugador2_id FROM equipos_padel WHERE id IN (?)',
      [[match.equipo1_id, match.equipo2_id]]
    )
    const players = teams.flatMap((e) => [Number(e.jugador1_id), Number(e.jugador2_id)])
    if (teams.length !== 2 || players.some((p) => !p) || new Set(players).size !== 4)
      fail('Un jugador no puede estar en ambos lados del partido')
    const [duplicates] = await conn.query(
      "SELECT id FROM partidos WHERE torneo_id=? AND fase='grupos' AND estado<>'cancelado' AND id<>? AND ((equipo1_id=? AND equipo2_id=?) OR (equipo1_id=? AND equipo2_id=?)) LIMIT 1",
      [
        match.torneo_id,
        match.id || 0,
        match.equipo1_id,
        match.equipo2_id,
        match.equipo2_id,
        match.equipo1_id,
      ]
    )
    if (duplicates.length) fail(`Este cruce ya existe en el partido #${duplicates[0].id}`)
  } else {
    for (const id of [match.equipo1_id, match.equipo2_id].filter(Boolean)) {
      if (Number(map.get(Number(id))?.categoria_id) !== Number(match.categoria_id))
        fail('La pareja no está asignada a esta categoría del torneo')
    }
  }
  return true
}
