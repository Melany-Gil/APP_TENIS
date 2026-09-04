const fs = require('fs')
const multer = require('multer')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { error } = require('../utils/response')

const configuredUploadDir = process.env.UPLOAD_DIR || 'uploads'
const UPLOAD_ROOT = path.isAbsolute(configuredUploadDir)
  ? path.resolve(configuredUploadDir)
  : path.resolve(__dirname, '..', '..', configuredUploadDir)
const configuredMaxSize = Number.parseInt(process.env.MAX_FILE_SIZE_MB || '2', 10)
const MAX_SIZE_MB = Number.isInteger(configuredMaxSize) && configuredMaxSize > 0
  ? configuredMaxSize
  : 2
const EXTENSIONS_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const storage = multer.diskStorage({
  destination: (_req, file, callback) => {
    const subfolder = file.fieldname === 'avatar'
      ? 'avatars'
      : file.fieldname === 'foto'
        ? 'players'
        : 'logos'
    const destination = path.join(UPLOAD_ROOT, subfolder)
    fs.mkdirSync(destination, { recursive: true })
    callback(null, destination)
  },
  filename: (_req, file, callback) => {
    const extension = EXTENSIONS_BY_MIME[file.mimetype]
    callback(null, `${Date.now()}-${uuidv4()}${extension}`)
  },
})

const upload = multer({
  storage,
  fileFilter: (_req, file, callback) => {
    if (EXTENSIONS_BY_MIME[file.mimetype]) return callback(null, true)
    return callback(new Error('Tipo de archivo no permitido. Usa JPEG, PNG o WEBP.'), false)
  },
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
})

const handleUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (uploadError) => {
    if (uploadError instanceof multer.MulterError) {
      const message = uploadError.code === 'LIMIT_FILE_SIZE'
        ? `El archivo excede el tamaño máximo de ${MAX_SIZE_MB}MB`
        : uploadError.message
      return error(res, message, 400)
    }
    if (uploadError) return error(res, uploadError.message, 400)
    return next()
  })
}

const toPublicUploadPath = (file) => {
  if (!file?.path) return null
  const relativePath = path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/')
  return `/uploads/${relativePath}`
}

const deleteUpload = (publicPath) => {
  if (!publicPath || !String(publicPath).startsWith('/uploads/')) return
  const relativePath = String(publicPath).slice('/uploads/'.length)
  const resolvedPath = path.resolve(UPLOAD_ROOT, relativePath)
  const uploadPrefix = `${UPLOAD_ROOT}${path.sep}`
  if (!resolvedPath.startsWith(uploadPrefix)) return
  try {
    fs.unlinkSync(resolvedPath)
  } catch (fileError) {
    if (fileError.code !== 'ENOENT') {
      console.warn(`No se pudo eliminar el archivo ${resolvedPath}: ${fileError.message}`)
    }
  }
}

exports.UPLOAD_ROOT = UPLOAD_ROOT
exports.uploadAvatar = handleUpload('avatar')
exports.uploadFoto = handleUpload('foto')
exports.uploadLogo = handleUpload('logo')
exports.toPublicUploadPath = toPublicUploadPath
exports.deleteUpload = deleteUpload
