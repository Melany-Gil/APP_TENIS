const KEY = 'session-recovery-v1'

export function readSessionRecovery(storage) {
  try {
    const value = JSON.parse(storage.getItem(KEY))
    if (!value?.userId || !/^\/(juez|director)(\/|$)/.test(value.path)) return null
    return value
  } catch { return null }
}

export function saveSessionRecovery(storage, user, path) {
  if (!user?.id || !/^\/(juez|director)(\/|$)/.test(path)) return
  try { storage.setItem(KEY, JSON.stringify({ userId: String(user.id), role: user.rol, path })) } catch {}
}

export function clearSessionRecovery(storage) {
  try { storage.removeItem(KEY) } catch {}
}
