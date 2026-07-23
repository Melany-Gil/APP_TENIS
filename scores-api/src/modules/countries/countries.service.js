const db = require('../../config/db')

exports.getAll = async () => {
  const [rows] = await db.query('SELECT id, code, name, flag FROM countries ORDER BY name ASC')
  return rows
}
