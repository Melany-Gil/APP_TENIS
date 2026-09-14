const db = require('../../config/db')

// ── Get standings for a tournament ──────
exports.getByTorneo = async (torneoId) => {
  if (!Number.isSafeInteger(Number(torneoId)) || Number(torneoId) < 1)
    throw { status: 400, message: 'Torneo inválido' }
  // Fetch tournament info
  const [torneoRows] = await db.query(
    'SELECT id, nombre, deporte, modalidad, sistema, categoria_id, estado FROM torneos WHERE id = ? LIMIT 1',
    [torneoId]
  )
  if (!torneoRows.length) {
    throw { status: 404, message: 'Torneo no encontrado' }
  }

  const torneo = torneoRows[0]
  const isDoubles = torneo.modalidad === 'dobles' || torneo.deporte === 'padel'
  const col1 = isDoubles ? 'equipo1_id' : 'jugador1_id'
  const col2 = isDoubles ? 'equipo2_id' : 'jugador2_id'

  // Fetch all matches of this tournament (both finished and pending, to know participants & groups)
  const [allPartidos] = await db.query(
    `SELECT p.id, p.categoria_id, torneo_id, fase, grupo, ronda, p.estado, ganador, COALESCE(c.nombre,'Sin categoría') AS categoria_nombre,
            ${col1} AS p1_id, ${col2} AS p2_id
     FROM partidos p LEFT JOIN categorias c ON c.id=p.categoria_id
     WHERE torneo_id = ? AND p.estado <> 'cancelado'`,
    [torneoId]
  )

  const authoritative = isDoubles && torneo.sistema === 'grupos_eliminacion'
  const structure = authoritative ? await require('../torneos/grupos.service').get(torneoId) : null
  const assignment = new Map((structure?.parejas || []).map((p) => [Number(p.equipo_id), p]))
  const [categoryRows] = authoritative ? await db.query('SELECT id,nombre FROM categorias') : [[]]
  const catNames = new Map(categoryRows.map((c) => [Number(c.id), c.nombre]))
  const label = (c, g) => (catNames.get(Number(c)) || 'Sin categoría') + ' · ' + g
  const invalidIds = new Set((structure?.incidencias || []).map((i) => Number(i.partido_id)))
  const validMatch = (p) =>
    !authoritative ||
    (!invalidIds.has(Number(p.id)) &&
      p.fase === 'grupos' &&
      require('../torneos/grupos.service').isCompatible(
        { ...p, equipo1_id: p.p1_id, equipo2_id: p.p2_id },
        assignment
      ))
  const groupKey = (p) =>
    authoritative
      ? assignment.has(Number(p.p1_id))
        ? label(assignment.get(Number(p.p1_id)).categoria_id, assignment.get(Number(p.p1_id)).grupo)
        : null
      : p.fase === 'grupos'
        ? p.categoria_nombre + ' · ' + (p.grupo?.trim() || 'Sin grupo')
        : null
  // Collect participants and map them to their groups
  // participantId -> Set of groups
  const participantGroups = new Map()
  const allParticipantIds = new Set()
  const groupsSet = new Set()

  allPartidos.filter(validMatch).forEach((p) => {
    const groupName = groupKey(p)
    if (groupName) groupsSet.add(groupName)

    if (p.p1_id) {
      allParticipantIds.add(p.p1_id)
      if (!participantGroups.has(p.p1_id)) participantGroups.set(p.p1_id, new Set())
      if (groupName) participantGroups.get(p.p1_id).add(groupName)
    }
    if (p.p2_id) {
      allParticipantIds.add(p.p2_id)
      if (!participantGroups.has(p.p2_id)) participantGroups.set(p.p2_id, new Set())
      if (groupName) participantGroups.get(p.p2_id).add(groupName)
    }
  })

  if (authoritative) {
    for (const g of structure.grupos) groupsSet.add(label(g.categoria_id, g.nombre))
    for (const a of structure.parejas) {
      const pid = Number(a.equipo_id)
      allParticipantIds.add(pid)
      participantGroups.set(pid, new Set([label(a.categoria_id, a.grupo)]))
    }
  }

  // Also check inscripciones for this tournament
  const [inscritos] = await db.query(
    'SELECT jugador_id, equipo_id FROM inscripciones WHERE torneo_id = ? AND estado != ?',
    [torneoId, 'eliminado']
  )
  inscritos.forEach((insc) => {
    const pid = isDoubles ? insc.equipo_id : insc.jugador_id
    if (pid) {
      allParticipantIds.add(pid)
      if (!participantGroups.has(pid)) participantGroups.set(pid, new Set())
    }
  })

  // Fetch participant profiles
  const idsArr = Array.from(allParticipantIds)
  const participantMap = new Map()

  if (idsArr.length > 0) {
    if (isDoubles) {
      const [equipos] = await db.query(
        `SELECT e.id, e.nombre,
                j1.id AS j1_id, j1.nombre AS j1_nombre, j1.apellido AS j1_apellido, j1.foto AS j1_foto,
                j2.id AS j2_id, j2.nombre AS j2_nombre, j2.apellido AS j2_apellido, j2.foto AS j2_foto
         FROM equipos_padel e
         LEFT JOIN jugadores j1 ON j1.id = e.jugador1_id
         LEFT JOIN jugadores j2 ON j2.id = e.jugador2_id
         WHERE e.id IN (?)`,
        [idsArr]
      )
      equipos.forEach((e) => {
        participantMap.set(e.id, {
          id: e.id,
          nombre: e.nombre,
          jugador1: e.j1_id
            ? { id: e.j1_id, nombre: e.j1_nombre, apellido: e.j1_apellido, foto: e.j1_foto }
            : null,
          jugador2: e.j2_id
            ? { id: e.j2_id, nombre: e.j2_nombre, apellido: e.j2_apellido, foto: e.j2_foto }
            : null,
        })
      })
    } else {
      const [jugadores] = await db.query(
        'SELECT id, nombre, apellido, foto FROM jugadores WHERE id IN (?)',
        [idsArr]
      )
      jugadores.forEach((j) => {
        participantMap.set(j.id, {
          id: j.id,
          nombre: `${j.nombre} ${j.apellido}`.trim(),
          apellido: j.apellido,
          foto: j.foto || null,
        })
      })
    }
  }

  // Filter finished matches for stats
  const finishedPartidos = allPartidos.filter(
    (p) =>
      validMatch(p) && p.estado === 'finalizado' && ['jugador1', 'jugador2'].includes(p.ganador)
  )

  // Fetch sets for finished matches
  const finishedIds = finishedPartidos.map((p) => p.id)
  let setsByPartido = {}
  if (finishedIds.length > 0) {
    const [setsRows] = await db.query(
      'SELECT partido_id, games_j1, games_j2, completado FROM sets_partido WHERE partido_id IN (?) AND completado = 1',
      [finishedIds]
    )
    setsRows.forEach((s) => {
      if (!setsByPartido[s.partido_id]) setsByPartido[s.partido_id] = []
      setsByPartido[s.partido_id].push(s)
    })
  }

  // Helper to initialize stats record
  const createEmptyStats = (pid, group = null) => ({
    id: pid,
    participante: participantMap.get(pid) || {
      id: pid,
      nombre: `Participante #${pid}`,
    },
    grupo: group,
    pj: 0,
    pg: 0,
    pp: 0,
    sets_ganados: 0,
    sets_perdidos: 0,
    dif_sets: 0,
    games_favor: 0,
    games_contra: 0,
    dif_games: 0,
    puntos: 0,
  })

  // Global stats accumulator: pid -> stats
  const globalStats = new Map()
  idsArr.forEach((pid) => globalStats.set(pid, createEmptyStats(pid)))

  // Group-based stats accumulator: groupName -> (pid -> stats)
  const groupStats = new Map()
  groupsSet.forEach((g) => {
    groupStats.set(g, new Map())
  })

  // Assign participants to their groups
  participantGroups.forEach((groups, pid) => {
    groups.forEach((g) => {
      if (!groupStats.has(g)) groupStats.set(g, new Map())
      groupStats.get(g).set(pid, createEmptyStats(pid, g))
    })
  })

  // Function to process a finished match for a specific stats map
  const applyMatchToStats = (p, p1Stats, p2Stats) => {
    p1Stats.pj++
    p2Stats.pj++

    // Determine winner
    if (p.ganador === 'jugador1') {
      p1Stats.pg++
      p1Stats.puntos += 2
      p2Stats.pp++
      p2Stats.puntos += 1
    } else if (p.ganador === 'jugador2') {
      p2Stats.pg++
      p2Stats.puntos += 2
      p1Stats.pp++
      p1Stats.puntos += 1
    }

    // Process sets
    const sets = setsByPartido[p.id] || []
    sets.forEach((s) => {
      const g1 = Number(s.games_j1 || 0)
      const g2 = Number(s.games_j2 || 0)

      p1Stats.games_favor += g1
      p1Stats.games_contra += g2
      p2Stats.games_favor += g2
      p2Stats.games_contra += g1

      if (g1 > g2) {
        p1Stats.sets_ganados++
        p2Stats.sets_perdidos++
      } else if (g2 > g1) {
        p2Stats.sets_ganados++
        p1Stats.sets_perdidos++
      }
    })

    p1Stats.dif_sets = p1Stats.sets_ganados - p1Stats.sets_perdidos
    p1Stats.dif_games = p1Stats.games_favor - p1Stats.games_contra
    p2Stats.dif_sets = p2Stats.sets_ganados - p2Stats.sets_perdidos
    p2Stats.dif_games = p2Stats.games_favor - p2Stats.games_contra
  }

  // Aggregate stats from finished matches
  finishedPartidos.forEach((p) => {
    const p1 = p.p1_id
    const p2 = p.p2_id
    if (!p1 || !p2) return

    // Apply to global stats
    if (globalStats.has(p1) && globalStats.has(p2)) {
      applyMatchToStats(p, globalStats.get(p1), globalStats.get(p2))
    }

    // Apply to group stats if match has group
    const grp = groupKey(p)
    if (grp && groupStats.has(grp)) {
      const gMap = groupStats.get(grp)
      if (!gMap.has(p1)) gMap.set(p1, createEmptyStats(p1, grp))
      if (!gMap.has(p2)) gMap.set(p2, createEmptyStats(p2, grp))
      applyMatchToStats(p, gMap.get(p1), gMap.get(p2))
    }
  })

  // Sorter function: points DESC, PG DESC, dif_sets DESC, dif_games DESC, games_favor DESC
  const sortStandings = (list) => {
    return list
      .sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos
        if (b.pg !== a.pg) return b.pg - a.pg
        if (b.dif_sets !== a.dif_sets) return b.dif_sets - a.dif_sets
        if (b.dif_games !== a.dif_games) return b.dif_games - a.dif_games
        return (
          b.games_favor - a.games_favor ||
          a.participante.nombre.localeCompare(b.participante.nombre, 'es') ||
          a.id - b.id
        )
      })
      .map((entry, idx) => ({
        posicion: idx + 1,
        ...entry,
      }))
  }

  // Format global standings
  const tablaGeneral = sortStandings(Array.from(globalStats.values()))

  // Format group standings
  const grupos = Object.create(null)
  const sortedGroupNames = Array.from(groupsSet).sort((a, b) =>
    a.localeCompare(b, 'es', { numeric: true })
  )
  sortedGroupNames.forEach((gName) => {
    const gMap = groupStats.get(gName)
    grupos[gName] = sortStandings(Array.from(gMap.values()))
  })

  return {
    torneo: {
      id: torneo.id,
      nombre: torneo.nombre,
      deporte: torneo.deporte,
      modalidad: torneo.modalidad,
      sistema: torneo.sistema,
      categoria_id: torneo.categoria_id,
      estado: torneo.estado,
    },
    modalidad: isDoubles ? 'dobles' : 'individual',
    tiene_grupos: sortedGroupNames.length > 0,
    nombres_grupos: sortedGroupNames,
    grupos,
    tabla_general: tablaGeneral,
    categorias: authoritative
      ? categoryRows
          .filter((c) => structure.grupos.some((g) => Number(g.categoria_id) === Number(c.id)))
          .map((c) => ({
            ...c,
            grupos: structure.grupos
              .filter((g) => Number(g.categoria_id) === Number(c.id))
              .map((g) => ({ nombre: g.nombre, clave: label(c.id, g.nombre) })),
          }))
      : [],
    sin_grupo: authoritative ? tablaGeneral.filter((r) => !assignment.has(Number(r.id))) : [],
    incidencias: structure?.incidencias || [],
    grupos_explicitos: authoritative,
  }
}
