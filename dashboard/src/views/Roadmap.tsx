import { useState } from 'react'
import { issuesForProject, projectsInOrder, roadmap, STATUS_LABEL, STATUS_ORDER } from '../data.ts'
import type { Status } from '../types.ts'

export function Roadmap() {
  const [status, setStatus] = useState<Status | 'all'>('all')

  const shown = STATUS_ORDER.filter((s) => roadmap.issues.some((i) => i.status === s))

  return (
    <>
      <h1>Roadmap</h1>
      <p className="lede">
        Every issue, grouped by phase. Read from <code>docs/roadmap/roadmap.json</code>, the same
        file <code>scripts/roadmap.mjs</code> generates <code>ROADMAP.md</code> from. The dashboard
        never writes it.
      </p>

      <div className="filters">
        <button aria-pressed={status === 'all'} onClick={() => setStatus('all')}>
          All {roadmap.issues.length}
        </button>
        {shown.map((s) => (
          <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {STATUS_LABEL[s]} {roadmap.issues.filter((i) => i.status === s).length}
          </button>
        ))}
      </div>

      {projectsInOrder.map((p) => {
        const issues = issuesForProject(p.id).filter((i) => status === 'all' || i.status === status)
        if (!issues.length) return null
        return (
          <section key={p.id}>
            <h2>
              {p.name} <span className="est">{p.target}</span>
            </h2>
            {issues.map((i) => (
              <div className="row" key={i.key}>
                <span className="key">{i.key}</span>
                <div className="row-body">
                  <div className="row-title">{i.title}</div>
                  <div className="row-sum">{i.summary}</div>
                  {i.blockedBy?.length ? (
                    <div className="row-sum">Blocked by {i.blockedBy.join(', ')}</div>
                  ) : null}
                </div>
                <span className="pill" data-status={i.status}>{STATUS_LABEL[i.status]}</span>
                <span className="est">{i.estimate}</span>
              </div>
            ))}
          </section>
        )
      })}
    </>
  )
}
