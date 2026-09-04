const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function getMediaUrl(value) {
  if (!value) return null
  const mediaPath = String(value)
  if (/^https?:\/\//i.test(mediaPath) || mediaPath.startsWith('data:')) return mediaPath
  if (!mediaPath.startsWith('/')) return mediaPath
  if (API_BASE.startsWith('/')) return mediaPath
  try {
    return `${new URL(API_BASE).origin}${mediaPath}`
  } catch {
    return mediaPath
  }
}
