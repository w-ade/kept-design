import { decisionsInOrder } from '../data.ts'

export function Decisions() {
  return (
    <>
      <h1>Decisions</h1>
      <p className="lede">
        Open calls that block work. An issue depending on an unresolved decision does not get
        started — the decision gets made first.
      </p>

      {decisionsInOrder.map((d) => (
        <div className="card" key={d.key}>
          <div className="row" style={{ border: 0, padding: 0 }}>
            <span className="key">{d.key}</span>
            <div className="row-body"><h3>{d.title}</h3></div>
            <span className="pill" data-status={d.chosen ? 'done' : undefined}>
              {d.chosen ? 'Decided' : 'Open'}
            </span>
          </div>
          <p className="card-q">{d.question}</p>
          {d.options.map((o) => (
            <div className="opt" key={o.id}>
              <span className="opt-l">{o.label}</span>
              {o.id === d.chosen ? <span className="tag">chosen</span> : null}
              {o.id === d.recommended && o.id !== d.chosen ? (
                <span className="tag">recommended</span>
              ) : null}
              <span className="opt-d">{o.detail}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
