// Preserve legacy rows and the exact signedness of IDs; never merge users' read states.
exports.prepareNotifications = async (db) => {
  const [cols] = await db.query(
    "SELECT COLUMN_NAME,COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notificaciones'"
  )
  const names = new Set(cols.map((c) => c.COLUMN_NAME))
  const type = cols.find((c) => c.COLUMN_NAME === 'id')?.COLUMN_TYPE
  if (!/^(bigint|int)(\(\d+\))?( unsigned)?$/i.test(type || ''))
    throw Error('Tipo de identificador de notificaciones no compatible')
  if (!names.has('clave'))
    await db.query('ALTER TABLE notificaciones ADD COLUMN clave VARCHAR(180) NULL')
  await db.query(
    "UPDATE notificaciones SET clave=CONCAT('legacy:',id) WHERE clave IS NULL OR clave=''"
  )
  if (!names.has('leido_at')) {
    await db.query('ALTER TABLE notificaciones ADD COLUMN leido_at TIMESTAMP NULL')
    const [readCols] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notificaciones_leidas'"
    )
    if (
      ['user_id', 'notificacion_id', 'leido_at'].every((n) =>
        readCols.some((c) => c.COLUMN_NAME === n)
      )
    )
      await db.query(
        'UPDATE notificaciones n JOIN notificaciones_leidas r ON r.notificacion_id=n.id AND r.user_id=n.user_id SET n.leido_at=r.leido_at WHERE n.leido_at IS NULL'
      )
  }
  const [indexes] = await db.query(
    "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notificaciones'"
  )
  if (!indexes.some((i) => i.INDEX_NAME === 'uq_notificacion_evento'))
    await db.query(
      'ALTER TABLE notificaciones ADD UNIQUE KEY uq_notificacion_evento (user_id,clave)'
    )
  if (!indexes.some((i) => i.INDEX_NAME === 'idx_notificacion_usuario'))
    await db.query('CREATE INDEX idx_notificacion_usuario ON notificaciones (user_id,id)')
  return type.toUpperCase()
}
