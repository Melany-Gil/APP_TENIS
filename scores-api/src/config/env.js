const productionRequired = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'OTP_SECRET',
  'MAIL_HOST',
  'MAIL_USER',
  'MAIL_PASS',
  'FRONTEND_URL',
]

const missing = productionRequired.filter((key) => !process.env[key])
if (process.env.NODE_ENV === 'production' && missing.length) {
  throw new Error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`)
}

for (const key of ['JWT_SECRET', 'OTP_SECRET']) {
  if (process.env.NODE_ENV === 'production' && process.env[key]?.length < 32) {
    throw new Error(`${key} debe tener al menos 32 caracteres`)
  }
}

module.exports = { missing }
