// Limpieza total de torneos + parejas + partidos, conservando jugadores.
// Uso seguro:
//   1. Vista previa (solo lectura):
//      node scripts/clean-torneos-parejas-partidos.js --env-file "C:\Users\MASTER\AppData\Local\Temp\opencode\.env.prod"
//   2. Ejecución real (tras respaldo):
//      node scripts/clean-torneos-parejas-partidos.js --env-file "...\.env.prod" --confirm
//
// Nunca borra: users, jugadores, categorias, sedes, canchas, countries, anuncios.
// Requiere respaldo previo de producción (Aiven). Todo va en transacción con
// verificación de que jugadores/users quedan intactos; si algo falla hace rollback.
const fs = require('node:fs')
const path = require('node:path')

function loadEnvFile(envFile) {
  if (!envFile) return
  const resolved = path.resolve(envFile)
  if (!fs.existsSync(resolved)) {
    throw new Error(`No existe el archivo de entorno: ${resolved}`)
  }
  require('dotenv').config({ path: resolved, override: true })
}

async function tableExists(conn, name) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [name]
  )
  return Number(rows[0].total) > 0
}

async function countOrNull(conn, sql, params = []) {
  try {
    const [rows] = await conn.query(sql, params)
    return Number(Object.values(rows[0])[0])
  } catch {
    return null
  }
}

async function readCounts(conn) {
  const counts = {}
  counts.torneos = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM torneos')
  counts.partidos = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM partidos')
  counts.parejas = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM equipos_padel')
  counts.inscripciones = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM inscripciones')
  counts.torneo_grupos = (await tableExists(conn, 'torneo_grupos'))
    ? await countOrNull(conn, 'SELECT COUNT(*) AS c FROM torneo_grupos')
    : null
  counts.torneo_grupo_parejas = (await tableExists(conn, 'torneo_grupo_parejas'))
    ? await countOrNull(conn, 'SELECT COUNT(*) AS c FROM torneo_grupo_parejas')
    : null
  counts.sets = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM sets_partido')
  counts.eventos = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM eventos_partido')
  counts.jugadores = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM jugadores')
  counts.users = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM users')
  counts.categorias = await countOrNull(conn, 'SELECT COUNT(*) AS c FROM categorias')
  return counts
}

async function deleteIfExists(conn, sql) {
  try {
    const [r] = await conn.query(sql)
    return r.affectedRows ?? 0
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return 0
    throw err
  }
}

async function main() {
  const args = process.argv.slice(2)
  const envFile = (() => {
    const i = args.indexOf('--env-file')
    return i >= 0 ? args[i + 1] : process.env.CLEAN_ENV_FILE || null
  })()
  const shouldDelete = args.includes('--confirm')
  const arg = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1] }

  loadEnvFile(envFile)
  if (!envFile) {
    // Sin --env-file usa el .env local por defecto (desarrollo). Para prod exige el archivo.
    console.log('Sin --env-file: usando .env local (desarrollo). Para producción pasa --env-file fuera del repo.')
    require('dotenv').config()
  }

  const db = require('../src/config/db')
  const conn = await db.getConnection()
  try {
    const [[dbInfo]] = await conn.query('SELECT DATABASE() AS db, @@hostname AS host')
    const before = await readCounts(conn)
    console.log('Conectado a:', dbInfo)
    console.log('Estado antes:', before)

    if (!shouldDelete) {
      console.log('Vista previa solamente (solo lectura). Revisa y, tras el respaldo, repite con --confirm.')
      return
    }

    if (before.jugadores === null || before.users === null) {
      throw new Error('No se pudo leer jugadores/users; cancelo por seguridad')
    }

    if (!arg('--expected-db') || arg('--expected-db') !== dbInfo.db) {
      throw new Error('Confirma la base exacta con --expected-db NOMBRE, usando el nombre de la vista previa.')
    }
    const backup = arg('--backup-file')
    if (!backup || !fs.existsSync(backup) || !fs.statSync(backup).isFile() || fs.statSync(backup).size === 0) {
      throw new Error('Debes tener un respaldo SQL completo y reciente: --backup-file RUTA. Comprueba que puedas restaurarlo.')
    }
    const [engines] = await conn.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE=\'BASE TABLE\' AND ENGINE<>\'InnoDB\'')
    if (engines.length) throw new Error('Hay tablas no transaccionales; cancelo para evitar un borrado parcial.')
    if (!await tableExists(conn, 'auditoria_eliminaciones')) throw new Error('Despliega primero la versión con auditoria_eliminaciones.')

    await conn.beginTransaction()
    const fingerprint = async table => {
      const [rows] = await conn.query(`SELECT * FROM ${table} ORDER BY id`)
      return require('node:crypto').createHash('sha256').update(JSON.stringify(rows)).digest('hex')
    }
    const playerHash = await fingerprint('jugadores')
    const userHash = await fingerprint('users')
    await conn.query(`INSERT INTO auditoria_eliminaciones (entidad,registro_id,detalle)
      SELECT 'auditoria_partido',partido_id,JSON_OBJECT('accion',accion,'detalle',detalle,'created_by',created_by,'created_at',created_at) FROM auditoria_control_partido`)
    await conn.query("INSERT INTO auditoria_eliminaciones (entidad,registro_id,detalle) VALUES ('limpieza',0,?)", [JSON.stringify(before)])

    // 1. Favoritos que apuntan a lo que se borra (no tienen CASCADE útil aquí).
    await deleteIfExists(conn, "DELETE FROM favoritos WHERE tipo IN ('partido','torneo','equipo')")
    // 2. Tickets de soporte apuntando a partidos -> SET NULL manual por claridad.
    await deleteIfExists(conn, 'UPDATE tickets_soporte SET partido_id = NULL WHERE partido_id IS NOT NULL')
    // 3. Dependientes de partidos (la mayoría ya es ON DELETE CASCADE, borrado explícito).
    await deleteIfExists(conn, 'DELETE FROM fotos_partido')
    await deleteIfExists(conn, 'DELETE FROM estado_en_vivo_partido')
    await deleteIfExists(conn, 'DELETE FROM auditoria_control_partido')
    await deleteIfExists(conn, 'DELETE FROM eventos_partido')
    await deleteIfExists(conn, 'DELETE FROM sets_partido')
    // 4. Partidos: primero romper encadenados (ganador de otro partido) para evitar bloqueos.
    try {
      await conn.query('UPDATE partidos SET origen_partido1_id = NULL, origen_partido2_id = NULL')
    } catch (err) { if (err.code !== 'ER_BAD_FIELD_ERROR') throw err }
    await conn.query('DELETE FROM partidos')
    // 5. Inscripciones y grupos del torneo.
    await deleteIfExists(conn, 'DELETE FROM inscripciones')
    await deleteIfExists(conn, 'DELETE FROM torneo_grupo_parejas')
    await deleteIfExists(conn, 'DELETE FROM torneo_grupos')
    // 6. Torneos y parejas. NO se toca jugadores ni users ni categorias.
    await conn.query('DELETE FROM torneos')
    await conn.query('DELETE FROM equipos_padel')
    // 7. Stats derivadas de partidos ya borrados (caché por jugador/temporada).
    await deleteIfExists(conn, 'DELETE FROM jugador_stats')

    const after = await readCounts(conn)
    console.log('Estado después (en transacción, antes de commit):', after)

    if (after.torneos !== 0 || after.partidos !== 0 || after.parejas !== 0 || after.inscripciones !== 0) {
      throw new Error('Verificación falló: quedaron torneos/partidos/parejas/inscripciones')
    }
    if (after.jugadores !== before.jugadores || after.users !== before.users) {
      throw new Error(
        `Verificación falló: jugadores/users cambiaron (antes ${before.jugadores}/${before.users}, ahora ${after.jugadores}/${after.users})`
      )
    }
    if (after.categorias !== before.categorias) {
      throw new Error('Verificación falló: cambiaron las categorías')
    }
    if (await fingerprint('jugadores') !== playerHash || await fingerprint('users') !== userHash) {
      throw new Error('Cambió el contenido de jugadores o usuarios; se revierte la limpieza.')
    }

    await conn.commit()
    console.log('Limpieza completada:', {
      torneosEliminados: before.torneos,
      partidosEliminados: before.partidos,
      parejasEliminadas: before.parejas,
      inscripcionesEliminadas: before.inscripciones,
      jugadoresConservados: after.jugadores,
      usuariosConservados: after.users,
    })
  } catch (error) {
    try {
      await conn.rollback()
    } catch {}
    throw error
  } finally {
    conn.release()
    await db.end()
  }
}

main().catch((error) => {
  console.error('ERROR:', error.message)
  process.exit(1)
})
