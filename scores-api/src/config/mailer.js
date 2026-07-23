const nodemailer = require('nodemailer')

const port = Number.parseInt(process.env.MAIL_PORT || '587', 10)

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port,
  secure: port === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  requireTLS: port !== 465,
  connectionTimeout: 10_000,
  socketTimeout: 15_000,
  disableFileAccess: true,
  disableUrlAccess: true,
})

if (process.env.NODE_ENV === 'production' && process.env.MAIL_USER && process.env.MAIL_PASS) {
  transporter
    .verify()
    .then(() => console.log('✅  Conexión SMTP establecida'))
    .catch((error) => console.error('❌  Error al conectar con SMTP:', error.message))
}

module.exports = transporter
