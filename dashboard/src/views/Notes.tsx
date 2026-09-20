import { notes } from '../data.ts'

export function Notes() {
  return (
    <>
      <h1>Notes</h1>
      <p className="lede">
        Working notes, newest first. Edit <code>dashboard/data/notes.json</code> to add one.
      </p>

      {notes.length === 0 ? <div className="empty">No notes yet.</div> : null}

      {notes.map((n) => (
        <article className="card note" key={n.id}>
          <h3>{n.title}</h3>
          <div className="note-meta">
            {n.date}
            {n.tags.length ? ` · ${n.tags.join(' · ')}` : ''}
          </div>
          {n.body.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </article>
      ))}
    </>
  )
}
