const D = require('./domain')
const security = require('./security')
const parse = (value) => (typeof value === 'string' ? JSON.parse(value) : value)
const admin = (actor) => {
  if (actor?.rol !== 'admin') D.fail('Acceso exclusivo de administración', 403)
}
const official = (actor) => {
  if (!['admin', 'juez', 'juez_director'].includes(actor?.rol))
    D.fail('No puedes registrar resultados', 403)
}
const id = (value) => D.integer(value, 1, 2147483647, 'Identificador')
exports.createPadelService = (db) => {
  async function tx(work) {
    const c = await db.getConnection()
    try {
      await c.beginTransaction()
      const result = await work(c)
      await c.commit()
      return result
    } catch (e) {
      await c.rollback()
      if (e.code === 'ER_DUP_ENTRY') D.fail('El registro ya existe. Actualiza la página.', 409)
      throw e
    } finally {
      c.release()
    }
  }
  async function event(c, eventId, lock = false) {
    const [rows] = await c.query(
      `SELECT * FROM padel_events WHERE id=?${lock ? ' FOR UPDATE' : ''}`,
      [id(eventId)]
    )
    if (!rows.length) D.fail('Evento no encontrado', 404)
    return rows[0]
  }
  const revision = (e, b) => {
    if (Number(b.version) !== e.version || b.version == null)
      D.fail('El evento cambió. Actualiza antes de continuar.', 409)
  }
  async function audit(c, eventId, actor, action, detail) {
    await c.query('INSERT INTO padel_audit (event_id,user_id,accion,detalle) VALUES (?,?,?,?)', [
      eventId,
      actor.id,
      action,
      JSON.stringify(detail),
    ])
  }
  async function bump(c, eventId) {
    await c.query('UPDATE padel_events SET version=version+1 WHERE id=?', [eventId])
  }
  async function ranking(c, eventId) {
    const [rows] = await c.query(
      `SELECT p.id,p.numero,p.jugador1,p.jugador2,p.disfraz,p.foto_url,COUNT(v.id) AS votos
      FROM padel_pairs p LEFT JOIN padel_votes v ON v.pareja_id=p.id AND v.event_id=p.event_id
      WHERE p.event_id=? GROUP BY p.id ORDER BY votos DESC,p.numero ASC`,
      [eventId]
    )
    return rows.map((r) => ({ ...r, votos: Number(r.votos) }))
  }
  return {
    async list() {
      const [rows] = await db.query(
        'SELECT id,nombre,fecha,votacion,publicado FROM padel_events ORDER BY fecha DESC,id DESC'
      )
      return rows
    },
    async create(b, actor) {
      admin(actor)
      const data = D.eventInput(b)
      return tx(async (c) => {
        const [r] = await c.query(
          'INSERT INTO padel_events (nombre,fecha,cancha1,cancha2,inicio,pausa_inicio,pausa_fin,cierre,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
          [...Object.values(data), actor.id]
        )
        await audit(c, r.insertId, actor, 'crear', data)
        return { id: r.insertId }
      })
    },
    async update(eventId, b, actor) {
      admin(actor)
      const data = D.eventInput(b)
      return tx(async (c) => {
        const e = await event(c, eventId, true)
        revision(e, b)
        const [matches] = await c.query('SELECT id FROM padel_fixture WHERE event_id=? LIMIT 1', [
          e.id,
        ])
        if (matches.length || e.votacion !== 'pendiente')
          D.fail('El horario y las canchas quedan cerrados después del sorteo', 409)
        await c.query(
          'UPDATE padel_events SET nombre=?,fecha=?,cancha1=?,cancha2=?,inicio=?,pausa_inicio=?,pausa_fin=?,cierre=?,version=version+1 WHERE id=?',
          [...Object.values(data), e.id]
        )
        await audit(c, e.id, actor, 'editar_evento', { antes: e, despues: data })
        return { ok: true }
      })
    },
    async detail(eventId, actor, browserId) {
      return tx(async (c) => {
        const e = await event(c, eventId)
        const [pairs] = await c.query(
          'SELECT id,numero,jugador1,jugador2,disfraz,foto_url FROM padel_pairs WHERE event_id=? ORDER BY numero',
          [e.id]
        )
        const [fixture] =
          e.publicado || actor?.rol === 'admin'
            ? await c.query('SELECT * FROM padel_fixture WHERE event_id=? ORDER BY turno,cancha', [
                e.id,
              ])
            : [[]]
        const [voted] = browserId
          ? await c.query('SELECT pareja_id FROM padel_votes WHERE event_id=? AND browser_hash=?', [
              e.id,
              security.digest(`browser:${browserId}`),
            ])
          : [[]]
        const counts = e.votacion === 'revelada' ? await ranking(c, e.id) : null
        const { created_by, desempate_motivo, ...publicEvent } = e
        return {
          event: publicEvent,
          pairs,
          fixture: fixture.map(({ updated_by, ...m }) => m),
          ranking: counts,
          voted: !!voted.length,
          serverTime: Date.now(),
        }
      })
    },
    async pair(eventId, pairId, b, actor) {
      admin(actor)
      const values = [
        D.integer(b.numero, 1, D.MAX_PAREJAS, 'Número de pareja'),
        D.name(b.jugador1, 'Primer jugador'),
        D.name(b.jugador2, 'Segundo jugador'),
        b.disfraz?.trim() ? D.name(b.disfraz, 'Disfraz') : '',
      ]
      if (values[1].toLowerCase() === values[2].toLowerCase())
        D.fail('Los dos integrantes deben ser diferentes')
      return tx(async (c) => {
        const e = await event(c, eventId, true)
        revision(e, b)
        if (e.votacion !== 'pendiente')
          D.fail('La inscripción está cerrada desde la apertura de la votación', 409)
        const [matches] = await c.query('SELECT id FROM padel_fixture WHERE event_id=? LIMIT 1', [
          e.id,
        ])
        if (matches.length && !pairId) D.fail('Las parejas ya están incluidas en el sorteo', 409)
        const [all] = await c.query(
          'SELECT id,jugador1,jugador2 FROM padel_pairs WHERE event_id=?',
          [e.id]
        )
        if (
          all
            .filter((p) => p.id !== Number(pairId))
            .some((p) =>
              [p.jugador1, p.jugador2].some((n) =>
                values.slice(1, 3).some((v) => v.toLocaleLowerCase() === n.toLocaleLowerCase())
              )
            )
        )
          D.fail('Uno de los jugadores ya está inscrito en otra pareja')
        let resultId = pairId
        if (pairId) {
          const [r] = await c.query(
            'UPDATE padel_pairs SET numero=?,jugador1=?,jugador2=?,disfraz=? WHERE id=? AND event_id=?',
            [...values, id(pairId), e.id]
          )
          if (!r.affectedRows) D.fail('Pareja no encontrada', 404)
        } else {
          if (all.length >= D.MAX_PAREJAS)
            D.fail(`El evento alcanzó el máximo de ${D.MAX_PAREJAS} parejas`, 409)
          const [r] = await c.query(
            'INSERT INTO padel_pairs (numero,jugador1,jugador2,disfraz,event_id) VALUES (?,?,?,?,?)',
            [...values, e.id]
          )
          resultId = r.insertId
        }
        await bump(c, e.id)
        await audit(c, e.id, actor, 'guardar_pareja', { id: resultId, numero: values[0] })
        return { id: resultId }
      })
    },
    async removePair(eventId, pairId, b, actor) {
      admin(actor)
      return tx(async (c) => {
        const e = await event(c, eventId, true)
        revision(e, b)
        const [matches] = await c.query('SELECT id FROM padel_fixture WHERE event_id=? LIMIT 1', [
          e.id,
        ])
        if (e.votacion !== 'pendiente' || matches.length)
          D.fail('No se puede retirar una pareja después del sorteo o de abrir la votación', 409)
        const [r] = await c.query('DELETE FROM padel_pairs WHERE id=? AND event_id=?', [
          id(pairId),
          e.id,
        ])
        if (!r.affectedRows) D.fail('Pareja no encontrada', 404)
        await bump(c, e.id)
        await audit(c, e.id, actor, 'retirar_pareja', { id: Number(pairId) })
        return { ok: true }
      })
    },
    async photo(eventId, pairId, b, url, actor) {
      official(actor)
      return tx(async (c) => {
        const e = await event(c, eventId, true)
        revision(e, b)
        if (e.votacion !== 'pendiente')
          D.fail('Las fotos quedan cerradas al abrir la votación', 409)
        if (!url) D.fail('Selecciona una foto')
        const [r] = await c.query('UPDATE padel_pairs SET foto_url=? WHERE id=? AND event_id=?', [
          url,
          id(pairId),
          e.id,
        ])
        if (!r.affectedRows) D.fail('Pareja no encontrada', 404)
        await bump(c, e.id)
        await audit(c, e.id, actor, 'foto', { id: Number(pairId), url })
        return { ok: true }
      })
    },
    async draw(eventId, b, actor) {
      admin(actor)
      return tx(async (c) => {
        const e = await event(c, eventId, true)
        revision(e, b)
        const [old] = await c.query('SELECT * FROM padel_fixture WHERE event_id=?', [e.id])
        if (e.publicado || old.some((m) => m.inicio_real || m.motivo))
          D.fail('El sorteo publicado no se puede reemplazar', 409)
        const [pairs] = await c.query(
          'SELECT id FROM padel_pairs WHERE event_id=? ORDER BY numero',
          [e.id]
        )
        const fixture = D.generateFixture(
          pairs.map((p) => p.id),
          e
        )
        await c.query('DELETE FROM padel_fixture WHERE event_id=?', [e.id])
        for (const m of fixture)
          await c.query(
            'INSERT INTO padel_fixture (event_id,turno,cancha,minuto,pareja1,pareja2) VALUES (?,?,?,?,?,?)',
            [e.id, m.turno, m.cancha, m.minuto, m.pareja1, m.pareja2]
          )
        await bump(c, e.id)
        await audit(c, e.id, actor, 'sorteo', { fixture })
        return { ok: true }
      })
    },
    async publish(eventId, b, actor) {
      admin(actor)
      return tx(async (c) => {
        const e = await event(c, eventId, true)
        revision(e, b)
        const [rows] = await c.query('SELECT id FROM padel_fixture WHERE event_id=?', [e.id])
        const [pairs] = await c.query('SELECT id FROM padel_pairs WHERE event_id=?', [e.id])
        if (!rows.length || rows.length !== pairs.length)
          D.fail('Completa el sorteo antes de publicar')
        await c.query('UPDATE padel_events SET publicado=1,version=version+1 WHERE id=?', [e.id])
        await audit(c, e.id, actor, 'publicar_sorteo', {})
        return { ok: true }
      })
    },
    async result(eventId, matchId, b, actor, startOnly = false) {
      official(actor)
      const data = startOnly ? null : D.resultInput(b)
      return tx(async (c) => {
        const e = await event(c, eventId, true)
        if (!e.publicado) D.fail('Publica el sorteo antes de registrar partidos', 409)
        const [rows] = await c.query(
          'SELECT * FROM padel_fixture WHERE id=? AND event_id=? FOR UPDATE',
          [id(matchId), e.id]
        )
        const m = rows[0]
        if (!m) D.fail('Partido no encontrado', 404)
        if (Number(b.version) !== m.version || b.version == null)
          D.fail('El partido cambió. Actualiza antes de guardar.', 409)
        if (startOnly) {
          if (m.inicio_real || m.motivo) D.fail('El partido ya se inició o tiene resultado', 409)
          const [playing] = await c.query(
            'SELECT * FROM padel_fixture WHERE event_id=? AND inicio_real IS NOT NULL AND motivo IS NULL',
            [e.id]
          )
          if (
            playing.some(
              (p) =>
                Number(p.inicio_real) + 1200000 > Date.now() &&
                (p.cancha === m.cancha ||
                  [p.pareja1, p.pareja2].some((x) => [m.pareja1, m.pareja2].includes(x)))
            )
          )
            D.fail('La cancha o una pareja aún tiene un partido en curso', 409)
          await c.query(
            'UPDATE padel_fixture SET inicio_real=?,version=version+1,updated_by=? WHERE id=?',
            [Date.now(), actor.id, m.id]
          )
        } else {
          if (m.motivo && !b.correccion?.trim()) D.fail('Indica el motivo de la corrección')
          await c.query(
            'UPDATE padel_fixture SET s1a=?,s1b=?,s2a=?,s2b=?,motivo=?,version=version+1,updated_by=? WHERE id=?',
            [data.s1a, data.s1b, data.s2a, data.s2b, data.motivo, actor.id, m.id]
          )
        }
        await audit(c, e.id, actor, startOnly ? 'iniciar_partido' : 'resultado', {
          partido: m.id,
          antes: m,
          despues: data,
          correccion: String(b.correccion || '').slice(0, 500),
        })
        return { ok: true }
      })
    },
    async voting(eventId, b, actor) {
      admin(actor)
      return tx(async (c) => {
        const e = await event(c, eventId, true)
        revision(e, b)
        const allowed = { pendiente: ['abierta'], abierta: ['cerrada'], cerrada: ['revelada'] }
        if (!allowed[e.votacion]?.includes(b.estado))
          D.fail('Ese cambio de votación no está disponible', 409)
        if (b.estado === 'abierta') {
          const [matches] = await c.query(
            'SELECT id FROM padel_fixture WHERE event_id=? LIMIT 1',
            [e.id]
          )
          if (!matches.length) D.fail('Realiza el sorteo antes de abrir la votación')
          const [pairs] = await c.query('SELECT id,foto_url FROM padel_pairs WHERE event_id=?', [
            e.id,
          ])
          if (!pairs.length || pairs.some((p) => !p.foto_url))
            D.fail('Completa las fotos de todas las parejas antes de abrir la votación')
        }
        if (b.estado === 'revelada') {
          const counts = await ranking(c, e.id)
          if (!counts.some((p) => p.votos > 0)) D.fail('Todavía no hay votos para revelar')
          const tied = counts.filter((p) => p.votos === counts[0].votos)
          if (tied.length > 1) {
            if (!tied.some((p) => p.id === Number(b.desempate_pareja)))
              D.fail('Selecciona entre las parejas empatadas al ganador del desempate')
            const reason = D.name(b.desempate_motivo, 'Motivo del desempate', 500)
            await c.query(
              'UPDATE padel_events SET desempate_pareja=?,desempate_motivo=? WHERE id=?',
              [Number(b.desempate_pareja), reason, e.id]
            )
          }
        }
        await c.query('UPDATE padel_events SET votacion=?,version=version+1 WHERE id=?', [
          b.estado,
          e.id,
        ])
        await audit(c, e.id, actor, 'votacion', {
          estado: b.estado,
          desempate_pareja: b.desempate_pareja || null,
          motivo: b.desempate_motivo || null,
        })
        return { ok: true }
      })
    },
    async vote(eventId, b, browserId) {
      if (!browserId) D.fail('Activa las cookies y vuelve a abrir la votación', 400)
      if (b.consentimiento !== true) D.fail('Confirma el uso de tus datos para registrar el voto')
      const nombre = D.name(b.nombre, 'Nombre'),
        telefono = D.phone(b.telefono)
      try {
        return await tx(async (c) => {
          const e = await event(c, eventId, true)
          if (e.votacion !== 'abierta') D.fail('La votación no está abierta', 409)
          const [pairs] = await c.query(
            'SELECT id FROM padel_pairs WHERE id=? AND event_id=? AND foto_url IS NOT NULL',
            [id(b.pareja_id), e.id]
          )
          if (!pairs.length) D.fail('Esta pareja no está disponible para votar', 404)
          const browserHash = security.digest(`browser:${browserId}`),
            phoneHash = security.digest(`phone:${telefono}`)
          const [exists] = await c.query(
            'SELECT id FROM padel_votes WHERE event_id=? AND (browser_hash=? OR phone_hash=?)',
            [e.id, browserHash, phoneHash]
          )
          if (exists.length) D.fail('Ya se registró un voto con este navegador o teléfono', 409)
          await c.query(
            'INSERT INTO padel_votes (event_id,pareja_id,browser_hash,phone_hash,datos_privados) VALUES (?,?,?,?,?)',
            [
              e.id,
              Number(b.pareja_id),
              browserHash,
              phoneHash,
              security.encrypt({ nombre, telefono }),
            ]
          )
          return { voted: true }
        })
      } catch (e) {
        if (e.status === 409 && e.message.includes('registro ya existe'))
          D.fail('Ya se registró un voto con este navegador o teléfono', 409)
        throw e
      }
    },
    async report(eventId, actor, after = 0) {
      admin(actor)
      const e = await event(db, eventId)
      const [votes] = await db.query(
        'SELECT id,pareja_id,datos_privados,created_at FROM padel_votes WHERE event_id=? AND id>? ORDER BY id LIMIT 100',
        [e.id, D.integer(after, 0, Number.MAX_SAFE_INTEGER, 'Página')]
      )
      const [auditRows] = await db.query(
        'SELECT id,user_id,accion,detalle,created_at FROM padel_audit WHERE event_id=? ORDER BY id DESC LIMIT 100',
        [e.id]
      )
      return {
        votes: votes.map(({ datos_privados, ...v }) => ({
          ...v,
          ...security.decrypt(datos_privados),
        })),
        next: votes.length === 100 ? votes.at(-1).id : null,
        ranking:
          e.votacion === 'cerrada' || e.votacion === 'revelada' ? await ranking(db, e.id) : null,
        audit: auditRows.map((r) => ({ ...r, detalle: parse(r.detalle) })),
      }
    },
  }
}
