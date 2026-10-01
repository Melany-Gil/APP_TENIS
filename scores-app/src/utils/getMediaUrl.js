import { resolveApiUrl } from '../services/api'

export function getMediaUrl(value) {
  if (!value) return null
  const mediaPath = String(value)
  if (/^https?:\/\//i.test(mediaPath) || mediaPath.startsWith('data:')) return mediaPath
  if (!mediaPath.startsWith('/')) return mediaPath
  const apiBase = resolveApiUrl()
  if (apiBase.startsWith('/')) return mediaPath
  try {
    return `${new URL(apiBase).origin}${mediaPath}`
  } catch {
    return mediaPath
  }
}
