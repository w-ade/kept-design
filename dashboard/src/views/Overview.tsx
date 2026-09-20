import { projectsInOrder, roadmap, totals } from '../data.ts'

export function Overview() {
  return (
    <>
      <h1>Overview</h1>
      <p className="lede">
        One place for how Kept is being built: the roadmap, the decisions still open, and the
        notes that do not belong in the product. Nothing here ships to the product site.
      </p>

      <div className="flag">
        Synced from the roadmap artifact on 20 September 2026 — 72 issues, 240 points, 12 phases,
        with the iOS track interleaved by dependency. The artifact stays authoritative; re-sync
        before planning if it has moved on.
      </div>

      <div className="stats">
        <div>
          <div className="stat-n">{totals.done}/{totals.issues}</div>
          <div className="stat-l">Issues done</div>
        </div>
        <div>
          <div className="stat-n">{totals.pointsDone}/{totals.points}</div>
          <div className="stat-l">Points done</div>
        </div>
        <div>
          <div className="stat-n">{projectsInOrder.length}</div>
          <div className="stat-l">Phases</div>
        </div>
        <div>
          <div className="stat-n">{totals.openDecisions}</div>
          <div className="stat-l">Decisions open</div>
        </div>
      </div>

      <h2>Phases</h2>
      {projectsInOrder.map((p) => {
        const issues = roadmap.issues.filter((i) => i.project === p.id)
        const done = issues.filter((i) => i.status === 'done').length
        return (
          <div className="row" key={p.id}>
            <span className="key">{p.id}</span>
            <div className="row-body">
              <h3>{p.name}</h3>
              <div className="row-sum">{p.summary}</div>
            </div>
            <span className="est">{done}/{issues.length}</span>
          </div>
        )
      })}
    </>
  )
}
