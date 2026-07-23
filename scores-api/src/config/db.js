const mysql = require('mysql2/promise')

const ssl =
  process.env.DB_SSL === 'true'
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ...(process.env.DB_SSL_CA_BASE64
          ? { ca: Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8') }
          : {}),
      }
    : undefined

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scoresapp',
  waitForConnections: true,
  connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl,
})

// Verificar conexión al arrancar
pool
  .getConnection()
  .then((conn) => {
    console.log('✅  Conexión a MySQL establecida')
    conn.release()
  })
  .catch((err) => {
    console.error('❌  Error al conectar con MySQL:', err.message)
  })

module.exports = pool
