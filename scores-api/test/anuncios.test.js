const test = require('node:test')
const assert = require('node:assert/strict')

// Configurar mock de base de datos para aislar pruebas del servicio
const dbPath = require.resolve('../src/config/db')

let mockRows = []
let autoInc = 1

const resetMockDb = () => {
  mockRows = [
    {
      id: 1,
      titulo: 'Gran Torneo Anual',
      contenido: 'Las inscripciones están abiertas.',
      imagen_url: '/uploads/anuncios/poster.webp',
      tipo: 'evento',
      publicado: 1,
      created_by: 10,
      created_at: new Date('2026-09-01T10:00:00Z'),
      autor_nombre: 'Comité de Tenis',
    },
    {
      id: 2,
      titulo: 'Aviso de Mantenimiento Canchas',
      contenido: 'Mantenimiento en arcilla este lunes.',
      imagen_url: null,
      tipo: 'aviso',
      publicado: 0, // borrador
      created_by: 10,
      created_at: new Date('2026-09-02T10:00:00Z'),
      autor_nombre: 'Comité de Tenis',
    },
  ]
  autoInc = 3
}

resetMockDb()

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    async query(sql, params = []) {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim()

      if (normalizedSql.startsWith('SELECT') && normalizedSql.includes('FROM anuncios a')) {
        let results = [...mockRows]
        if (normalizedSql.includes('WHERE a.id = ?')) {
          const id = Number(params[0])
          results = results.filter((r) => r.id === id)
        }
        if (normalizedSql.includes('AND a.publicado = TRUE')) {
          results = results.filter((r) => Boolean(r.publicado))
        }
        if (normalizedSql.includes('AND a.tipo = ?')) {
          const tipo = params[params.length - 1]
          results = results.filter((r) => r.tipo === tipo)
        }
        return [results]
      }

      if (normalizedSql.startsWith('INSERT INTO anuncios')) {
        const [titulo, contenido, tipo, imagen_url, publicado, created_by] = params
        const newRecord = {
          id: autoInc++,
          titulo,
          contenido,
          tipo,
          imagen_url,
          publicado: publicado ? 1 : 0,
          created_by,
          created_at: new Date(),
          autor_nombre: 'Admin Test',
        }
        mockRows.push(newRecord)
        return [{ insertId: newRecord.id }]
      }

      if (normalizedSql.startsWith('UPDATE anuncios SET publicado = ? WHERE id = ?')) {
        const [nuevoEstado, id] = params
        const row = mockRows.find((r) => r.id === Number(id))
        if (row) row.publicado = nuevoEstado ? 1 : 0
        return [{ affectedRows: row ? 1 : 0 }]
      }

      if (normalizedSql.startsWith('UPDATE anuncios SET titulo = ?')) {
        const [titulo, contenido, tipo, imagen_url, publicado, id] = params
        const row = mockRows.find((r) => r.id === Number(id))
        if (row) {
          row.titulo = titulo
          row.contenido = contenido
          row.tipo = tipo
          row.imagen_url = imagen_url
          row.publicado = publicado ? 1 : 0
        }
        return [{ affectedRows: row ? 1 : 0 }]
      }

      if (normalizedSql.startsWith('DELETE FROM anuncios WHERE id = ?')) {
        const id = Number(params[0])
        const initialLen = mockRows.length
        mockRows = mockRows.filter((r) => r.id !== id)
        return [{ affectedRows: initialLen - mockRows.length }]
      }

      return [[]]
    },
    async getConnection() {
      return {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        async query(sql, params = []) {
          const normalizedSql = sql.replace(/\s+/g, ' ').trim()
          if (normalizedSql.includes('SELECT imagen_url, publicado FROM anuncios WHERE id = ? FOR UPDATE')) {
            const row = mockRows.find((r) => r.id === Number(params[0]))
            return [row ? [row] : []]
          }
          if (normalizedSql.includes('SELECT id, publicado FROM anuncios WHERE id = ? FOR UPDATE')) {
            const row = mockRows.find((r) => r.id === Number(params[0]))
            return [row ? [row] : []]
          }
          if (normalizedSql.includes('SELECT imagen_url FROM anuncios WHERE id = ? FOR UPDATE')) {
            const row = mockRows.find((r) => r.id === Number(params[0]))
            return [row ? [row] : []]
          }
          if (normalizedSql.startsWith('UPDATE anuncios')) {
            return [{ affectedRows: 1 }]
          }
          if (normalizedSql.startsWith('DELETE FROM anuncios')) {
            const id = Number(params[0])
            mockRows = mockRows.filter((r) => r.id !== id)
            return [{ affectedRows: 1 }]
          }
          return [[]]
        },
      }
    },
  },
}

const newsService = require('../src/modules/news/news.service')

test('anuncios.service: lista pública solo devuelve anuncios publicados', async () => {
  resetMockDb()
  const publicList = await newsService.getAll({ includeAll: false })
  assert.equal(publicList.length, 1)
  assert.equal(publicList[0].id, 1)
  assert.equal(publicList[0].titulo, 'Gran Torneo Anual')
  assert.equal(publicList[0].autor_nombre, 'Comité de Tenis')
})

test('anuncios.service: lista administrativa incluye borradores', async () => {
  resetMockDb()
  const adminList = await newsService.getAll({ includeAll: true })
  assert.equal(adminList.length, 2)
  const borrador = adminList.find((a) => a.id === 2)
  assert.ok(borrador)
  assert.equal(borrador.publicado, 0)
})

test('anuncios.service: getById respeta visibilidad pública y administrativa', async () => {
  resetMockDb()
  // Public user gets published announcement
  const published = await newsService.getById(1, { includeAll: false })
  assert.equal(published.id, 1)

  // Public user fails on draft
  await assert.rejects(
    async () => newsService.getById(2, { includeAll: false }),
    /Anuncio no encontrado/
  )

  // Admin user can view draft
  const draft = await newsService.getById(2, { includeAll: true })
  assert.equal(draft.id, 2)
  assert.equal(draft.titulo, 'Aviso de Mantenimiento Canchas')
})

test('anuncios.service: validación estricta de campos obligatorios y tipos', async () => {
  await assert.rejects(
    async () => newsService.create({ titulo: '', contenido: 'Texto' }, 1),
    /Revisa el título/
  )
  await assert.rejects(
    async () => newsService.create({ titulo: 'Ok', contenido: '', tipo: 'noticia' }, 1),
    /Revisa el título/
  )
  await assert.rejects(
    async () => newsService.create({ titulo: 'Ok', contenido: 'Ok', tipo: 'invalido' }, 1),
    /Revisa el título/
  )
})

test('anuncios.service: creación y toggle de publicación funcionan correctamente', async () => {
  resetMockDb()
  const created = await newsService.create(
    {
      titulo: 'Nuevo Horario Nocturno',
      contenido: 'Canchas iluminadas hasta las 11:00 PM.',
      tipo: 'aviso',
      publicado: false, // se crea como borrador
    },
    10
  )
  assert.ok(created.id)
  assert.equal(created.publicado, false)

  // Cambiar visibilidad (toggle)
  const toggled = await newsService.togglePublicado(created.id)
  assert.equal(toggled.id, created.id)
  assert.equal(toggled.publicado, true)
})

test('anuncios.service: eliminación retira el registro', async () => {
  resetMockDb()
  const res = await newsService.remove(1)
  assert.equal(res.message, 'Anuncio eliminado')
  const list = await newsService.getAll({ includeAll: true })
  assert.equal(list.some((a) => a.id === 1), false)
})

test('publicación explícita es idempotente ante reintentos', async () => {
  resetMockDb()
  await newsService.togglePublicado(2, true)
  assert.equal((await newsService.togglePublicado(2, true)).publicado, true)
  await newsService.togglePublicado(2, false)
  assert.equal((await newsService.togglePublicado(2, false)).publicado, false)
})
