const path = require('path')

// Only Vite's content-hashed bundles are immutable. Public logos keep their
// names across releases and must be revalidated instead of cached for a year.
exports.setAssetCacheHeaders = (res, filePath) => {
  const file = path.basename(filePath)
  if (file.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store')
  } else if (/[\\/]assets[\\/]/.test(filePath) && /-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(file)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate')
  }
}
