const db = require('../../config/db')
exports.getAudit = async (id, after = 0) => {
  id = Number(id); after = Number(after)
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(after) || after < 0) throw { status: 400, message: 'Identificador de auditoría inválido' }
  const [match] = await db.query('SELECT id FROM partidos WHERE id = ?', [id])
  if (!match.length) throw { status: 404, message: 'Partido no encontrado' }
  const [events] = await db.query(`SELECT e.id, e.secuencia, e.tipo, e.ganador, e.motivo, e.anulado_at, e.created_at,
    CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) AS autor_nombre,
    CONCAT(a.nombre, ' ', COALESCE(a.apellido, '')) AS anulador_nombre
    FROM eventos_partido e LEFT JOIN users u ON u.id = e.created_by
    LEFT JOIN users a ON a.id = e.anulado_por
    WHERE e.partido_id = ? AND e.secuencia > ? ORDER BY e.secuencia ASC LIMIT 101`, [id, after])
  const [control] = await db.query(`SELECT a.id, a.accion, a.detalle, a.created_at,
    CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) AS autor_nombre
    FROM auditoria_control_partido a LEFT JOIN users u ON u.id = a.created_by
    WHERE a.partido_id = ? ORDER BY a.id DESC LIMIT 101`, [id])
  return { eventos: events.slice(0, 100), siguiente: events.length > 100 ? events[99].secuencia : null, intervenciones: control.slice(0, 100), control_limitado: control.length > 100 }
}
