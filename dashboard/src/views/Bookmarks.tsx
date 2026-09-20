import { useMemo, useState } from 'react'
import { bookmarks } from '../data.ts'

// In dev, the Vite plugin writes data/bookmarks.json and HMR reloads it. In a deployed build there
// is no server, so the form is hidden and the list is read-only.
const CAN_EDIT = import.meta.env.DEV

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function Bookmarks() {
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tag, setTag] = useState<string | null>(null)

  const allTags = useMemo(() => [...new Set(bookmarks.flatMap((b) => b.tags))].sort(), [])
  const shown = tag ? bookmarks.filter((b) => b.tags.includes(tag)) : bookmarks

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          url,
          note,
          tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setUrl('')
      setNote('')
      setTags('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
  }

  return (
    <>
      <h1>Bookmarks</h1>
      <p className="lede">
        Links worth keeping for reference, newest first.{' '}
        {CAN_EDIT ? 'Paste one below; the title is fetched for you.' : <>Edit <code>dashboard/data/bookmarks.json</code> to add one.</>}
      </p>

      {CAN_EDIT ? (
        <form className="card bm-form" onSubmit={add}>
          <input
            className="bm-input"
            placeholder="Paste a link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <div className="bm-form-row">
            <input
              className="bm-input"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <input
              className="bm-input bm-tags-input"
              placeholder="tags, comma separated"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <button className="bm-btn" disabled={busy || !url.trim()}>
              {busy ? 'Saving…' : 'Add'}
            </button>
          </div>
          {error ? <div className="bm-error">{error}</div> : null}
        </form>
      ) : null}

      {allTags.length ? (
        <div className="filters">
          <button aria-pressed={tag === null} onClick={() => setTag(null)}>All</button>
          {allTags.map((t) => (
            <button key={t} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
      ) : null}

      {bookmarks.length === 0 ? <div className="empty">No bookmarks yet.</div> : null}

      {shown.map((b) => (
        <article className="card bm" key={b.id}>
          <div className="bm-head">
            <h3>
              <a href={b.url} target="_blank" rel="noreferrer">{b.title}</a>
            </h3>
            {CAN_EDIT ? (
              <button className="bm-x" aria-label={`Remove ${b.title}`} onClick={() => remove(b.id)}>×</button>
            ) : null}
          </div>
          <div className="note-meta">
            {host(b.url)} · {b.added}
            {b.tags.length ? ` · ${b.tags.join(' · ')}` : ''}
          </div>
          {b.note ? <p>{b.note}</p> : null}
        </article>
      ))}
    </>
  )
}
