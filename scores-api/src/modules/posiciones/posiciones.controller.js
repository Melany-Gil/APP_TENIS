const service = require('./posiciones.service')
const { success, error } = require('../../utils/response')

// ── Get standings by tournament ──────
exports.getByTorneo = async (req, res) => {
  try {
    const data = await service.getByTorneo(req.params.torneo_id)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener posiciones', err.status || 500)
  }
}
