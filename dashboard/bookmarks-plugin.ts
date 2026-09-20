import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

// Dev-only: POST /api/bookmarks appends to data/bookmarks.json, DELETE /api/bookmarks/:id removes.
// The deployed build has no server, so the Bookmarks view hides its form there.
const FILE = fileURLToPath(new URL('./data/bookmarks.json', import.meta.url))

interface Stored {
  id: string
  url: string
  title: string
  note: string
  tags: string[]
  added: string
}

const load = async (): Promise<Stored[]> => JSON.parse(await readFile(FILE, 'utf8'))
const save = (list: Stored[]) => writeFile(FILE, JSON.stringify(list, null, 2) + '\n')

async function pageTitle(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: 'follow' })
    const html = (await res.text()).slice(0, 200_000)
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    return m ? m[1].replace(/\s+/g, ' ').trim() : ''
  } catch {
    return ''
  }
}

function body(req: import('node:http').IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch (e) { reject(e) }
    })
  })
}

export function bookmarksApi(): Plugin {
  return {
    name: 'kept-bookmarks-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/bookmarks', async (req, res) => {
        const send = (code: number, data: unknown) => {
          res.statusCode = code
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(data))
        }
        try {
          if (req.method === 'POST') {
            const b = await body(req)
            let url = String(b.url ?? '').trim()
            if (!url) return send(400, { error: 'url required' })
            if (!/^https?:\/\//i.test(url)) url = `https://${url}`
            new URL(url) // throws on garbage
            const list = await load()
            const item: Stored = {
              id: `b${Date.now().toString(36)}`,
              url,
              title: String(b.title ?? '').trim() || (await pageTitle(url)) || new URL(url).hostname,
              note: String(b.note ?? '').trim(),
              tags: Array.isArray(b.tags) ? b.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
              added: new Date().toISOString().slice(0, 10),
            }
            await save([item, ...list])
            return send(200, item)
          }
          if (req.method === 'DELETE') {
            const id = (req.url ?? '').replace(/^\//, '')
            await save((await load()).filter((x) => x.id !== id))
            return send(200, { ok: true })
          }
          send(405, { error: 'method not allowed' })
        } catch (e) {
          send(400, { error: String(e) })
        }
      })
    },
  }
}
