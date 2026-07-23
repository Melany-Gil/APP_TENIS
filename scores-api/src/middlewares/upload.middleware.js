const multer = require('multer')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { error } = require('../utils/response')

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '5')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ── Configuración de almacenamiento ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', '..', UPLOAD_DIR, 'logos'))
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uniqueName = `${Date.now()}-${uuidv4()}${ext}`
    cb(null, uniqueName)
  },
})

// ── Filtro de archivos ───────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan: JPEG, PNG, WEBP'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
})

/**
 * Middleware para subir un logo de equipo.
 * Espera un campo 'logo' en el form-data.
 * Maneja errores de multer y los convierte en respuesta estándar.
 */
exports.uploadLogo = (req, res, next) => {
  const singleUpload = upload.single('logo')

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, `El archivo excede el tamaño máximo de ${MAX_SIZE_MB}MB`, 400)
      }
      return error(res, err.message, 400)
    }
    if (err) {
      return error(res, err.message, 400)
    }
    next()
  })
}
