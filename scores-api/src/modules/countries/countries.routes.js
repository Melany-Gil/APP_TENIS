const router = require('express').Router()
const service = require('./countries.service')
const { success, error } = require('../../utils/response')
const { requireAuth } = require('../../middlewares/auth.middleware')

router.get('/', requireAuth, async (req, res) => {
  try {
    return success(res, await service.getAll())
  } catch (err) {
    return error(res, err.message || 'Error al obtener países', 500)
  }
})

module.exports = router
