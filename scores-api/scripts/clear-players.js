require('dotenv').config()

const db = require('../src/config/db')

const shouldDelete = process.argv.includes('--confirm')

async function readCounts(connection) {
  const [[counts]] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM partidos) AS partidos,
      (SELECT COUNT(*) FROM jugadores) AS jugadores,
      (SELECT COUNT(*) FROM equipos_padel) AS parejas,
      (SELECT COUNT(*) FROM inscripciones) AS inscripciones,
      (SELECT COUNT(*) FROM users) AS usuarios
  `)
  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value)]))
}

async function main() {
  const connection = await db.getConnection()
  try {
    const before = await readCounts(connection)
    console.log('Estado actual:', before)

    if (!shouldDelete) {
      console.log('Vista previa solamente. Usa --confirm para ejecutar la limpieza.')
      return
    }
    if (before.partidos !== 0) {
      throw new Error(`Limpieza cancelada: todavía existen ${before.partidos} partidos`)
    }

    await connection.beginTransaction()
    await connection.query("DELETE FROM favoritos WHERE tipo IN ('jugador', 'equipo')")
    await connection.query('DELETE FROM inscripciones')
    await connection.query('DELETE FROM equipos_padel')
    await connection.query('DELETE FROM jugador_stats')
    await connection.query('DELETE FROM jugadores')

    const after = await readCounts(connection)
    if (
      after.partidos !== 0 ||
      after.jugadores !== 0 ||
      after.parejas !== 0 ||
      after.inscripciones !== 0 ||
      after.usuarios !== before.usuarios
    ) {
      throw new Error('La verificación de integridad posterior a la limpieza falló')
    }

    await connection.commit()
    console.log('Limpieza completada:', {
      jugadoresEliminados: before.jugadores,
      parejasEliminadas: before.parejas,
      inscripcionesEliminadas: before.inscripciones,
      usuariosConservados: after.usuarios,
    })
  } catch (error) {
    try {
      await connection.rollback()
    } catch {}
    throw error
  } finally {
    connection.release()
    await db.end()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
