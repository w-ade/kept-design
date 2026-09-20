import { SCREENS, type Screen } from '../screens.ts'

// iPhone 17 Pro, in points. Verify against Xcode before anyone builds to these.
const DEVICE = { w: 402, h: 874, top: 59, bottom: 34, radius: 56 }

function Phone({ s }: { s: Screen }) {
  return (
    <div className="phone" role="img" aria-label={`${s.name} wireframe`}>
      <div className="phone-btns" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className="phone-screen">
        {/* 59pt top safe area: status bar with the Dynamic Island */}
        <div className="safe-top">
          <span className="status-time">9:41</span>
          <span className="island" />
          <span className="status-icons" />
        </div>

        {s.nav !== 'none' ? (
          <div className={`nav nav-${s.nav}`}>
            <div className="nav-bar">
              {s.back ? <span className="nav-back">‹ {s.back}</span> : <span />}
              {s.nav === 'inline' && s.navTitle ? (
                <span className="nav-title-inline">{s.navTitle}</span>
              ) : (
                <span />
              )}
              <span className="nav-action" />
            </div>
            {s.nav === 'large' ? <div className="nav-large">{s.navTitle}</div> : null}
            {s.search ? <div className="nav-search" /> : null}
          </div>
        ) : null}

        <div className={`content${s.nav === 'none' ? ' content-flush' : ''}`}>{s.render()}</div>

        {s.tab ? (
          <div className="tabbar">
            {(['Library', 'Capture', 'Account'] as const).map((t) => (
              <span key={t} aria-current={t === s.tab ? 'page' : undefined}>
                <i className="tab-dot" />
                {t}
              </span>
            ))}
          </div>
        ) : null}

        {/* 34pt bottom safe area */}
        <div className="safe-bottom">
          <span className="home-indicator" />
        </div>
      </div>
    </div>
  )
}

export function Screens() {
  return (
    <>
      <h1>v0.0.0 iOS screens</h1>
      <p className="lede">
        Skeleton wireframes for the first native build, drawn to iPhone 17 Pro geometry —{' '}
        {DEVICE.w}×{DEVICE.h}pt, {DEVICE.top}pt top inset, {DEVICE.bottom}pt bottom inset. Every
        measurement is in points and scaled by <code>--pt</code>. Derived from the web routes in{' '}
        <code>src/kept/KeptApp.tsx</code>; a starting point for p8, not a settled spec.
      </p>

      <div className="flag">
        Body, screen and Dynamic Island are measured off the iPhone 17 Pro Figma frame: {DEVICE.w}×
        {DEVICE.h}pt at r{DEVICE.radius}, 8pt bezel, 112×32pt island 13pt down. The {DEVICE.top}/
        {DEVICE.bottom}pt safe areas and the iOS 26 floating tab bar are still from memory — check
        those two against Xcode before building to them.
      </div>

      {SCREENS.map((s) => (
        <section className="screen" key={s.id}>
          <h2>
            {s.name} <span className="est">{s.route}</span>
          </h2>
          <p className="row-sum screen-from">
            From {s.from} · {s.nav === 'large' ? '96pt large title' : s.nav === 'inline' ? '44pt inline nav' : 'no nav bar'}
            {s.tab ? ' · 83pt tab bar' : ' · no tab bar'}
          </p>

          <div className="screen-body">
            <Phone s={s} />
            <ol className="annos">
              {s.notes.map((n, i) => (
                <li key={i}>
                  <span className="anno-n">{i + 1}</span>
                  <span>{n}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ))}
    </>
  )
}
