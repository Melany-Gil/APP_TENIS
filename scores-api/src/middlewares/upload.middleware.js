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
        : file.fieldname === 'imagen' ? 'anuncios' : 'logos'
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

const mediaStorage = require('../modules/media/mediaStorage.service')

const processAndPersist = (options = {}) => async (req, res, next) => {
  if (!req.file) return next()
  const raw = req.file.path
  const parsed = path.parse(raw)
  const optimized = path.join(parsed.dir, `${parsed.name}.webp`)

  let persistedImage = false
  try {
    const sharpInstance = require('sharp')(raw, { limitInputPixels: 16000000 })
      .rotate()
      .resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: options.quality || 80 })

    const buffer = await sharpInstance.toBuffer()
    await fs.promises.writeFile(optimized, buffer)

    if (raw !== optimized) {
      try { fs.unlinkSync(raw) } catch {}
    }

    req.file.path = optimized
    req.file.mimetype = 'image/webp'
    req.file.size = buffer.length
    req.file.filename = path.basename(optimized)

    persistedImage = true
    const publicPath = toPublicUploadPath(req.file)
    if (publicPath) {
      await mediaStorage.save(publicPath, buffer, 'image/webp')
    }

    return next()
  } catch (err) {
    for (const filename of [raw, optimized]) {
      try { fs.unlinkSync(filename) } catch {}
    }
    if (persistedImage) return error(res, 'No se pudo guardar la imagen en el servidor. Reintenta más tarde.', 503)
    return error(res, 'No se pudo procesar la imagen. Usa una imagen válida de hasta 16 megapíxeles.', 400)
  }
}

const deleteUpload = (publicPath) => {
  if (!publicPath || !String(publicPath).startsWith('/uploads/')) return
  const relativePath = String(publicPath).slice('/uploads/'.length)
  const resolvedPath = path.resolve(UPLOAD_ROOT, relativePath)
  const uploadPrefix = `${UPLOAD_ROOT}${path.sep}`
  if (!resolvedPath.startsWith(uploadPrefix)) return
  {
    try {
      fs.unlinkSync(resolvedPath)
    } catch (fileError) {
      if (fileError.code !== 'ENOENT') {
        console.warn(`No se pudo eliminar el archivo ${resolvedPath}: ${fileError.message}`)
      }
    }
  }
  mediaStorage.delete(publicPath).catch((err) => {
    console.warn(`[mediaStorage] No se pudo eliminar ${publicPath}: ${err.message}`)
  })
}

exports.UPLOAD_ROOT = UPLOAD_ROOT
exports.uploadAvatar = (req, res, next) =>
  handleUpload('avatar')(req, res, () =>
    processAndPersist({ width: 400, height: 400, fit: 'cover', quality: 80 })(req, res, next)
  )
exports.uploadFoto = (req, res, next) =>
  handleUpload('foto')(req, res, () =>
    processAndPersist({ width: 600, height: 600, fit: 'inside', quality: 80 })(req, res, next)
  )
exports.uploadLogo = (req, res, next) =>
  handleUpload('logo')(req, res, () =>
    processAndPersist({ width: 600, height: 600, fit: 'inside', quality: 85 })(req, res, next)
  )
exports.uploadAnuncio = (req, res, next) =>
  handleUpload('imagen')(req, res, () =>
    processAndPersist({ width: 1600, height: 1600, fit: 'inside', quality: 82 })(req, res, next)
  )
exports.toPublicUploadPath = toPublicUploadPath
exports.deleteUpload = deleteUpload
