const REFERENCED_ROW_CODES = new Set(['ER_ROW_IS_REFERENCED', 'ER_ROW_IS_REFERENCED_2'])

/**
 * Convierte una restricción de integridad de MySQL en una explicación segura.
 * Las comprobaciones específicas de cada servicio deben ejecutarse primero para
 * poder indicar exactamente qué relación impide eliminar el registro.
 */
exports.rethrowDeleteConflict = (error, entityLabel) => {
  if (REFERENCED_ROW_CODES.has(error?.code) || Number(error?.errno) === 1451) {
    throw {
      status: 409,
      message: `No se puede eliminar ${entityLabel} porque todavía tiene registros relacionados. Elimina o reasigna esas relaciones e inténtalo nuevamente.`,
    }
  }
  throw error
}

exports.describeDependencies = (dependencies) => {
  const active = dependencies.filter(({ count }) => Number(count) > 0)
  return active.map(({ count, singular, plural }) => `${count} ${Number(count) === 1 ? singular : plural}`)
}
