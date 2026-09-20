import { useSyncExternalStore } from 'react'
import { Overview } from './views/Overview.tsx'
import { Roadmap } from './views/Roadmap.tsx'
import { Decisions } from './views/Decisions.tsx'
import { Notes } from './views/Notes.tsx'
import { Bookmarks } from './views/Bookmarks.tsx'
import { Screens } from './views/Screens.tsx'
import { totals } from './data.ts'

const TABS = [
  { id: '', label: 'Overview', view: Overview },
  { id: 'roadmap', label: 'Roadmap', view: Roadmap },
  { id: 'decisions', label: 'Decisions', view: Decisions },
  { id: 'screens', label: 'Screens', view: Screens },
  { id: 'notes', label: 'Notes', view: Notes },
  { id: 'bookmarks', label: 'Bookmarks', view: Bookmarks },
] as const

// Real paths, same as the product SPA — history navigation, no reloads.
function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener('kept-dashboard-navigate', onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('kept-dashboard-navigate', onChange)
  }
}

function currentTab() {
  return window.location.pathname.replace(/^\/+|\/+$/g, '')
}

function navigate(id: string) {
  window.history.pushState(null, '', `/${id}`)
  window.dispatchEvent(new Event('kept-dashboard-navigate'))
}

export function App() {
  const route = useSyncExternalStore(subscribe, currentTab, () => '')
  const tab = TABS.find((t) => t.id === route) ?? TABS[0]
  const View = tab.view

  return (
    <div className="shell">
      <nav className="side">
        <div className="brand">KEPT</div>
        <div className="brand-sub">Dashboard</div>
        <div className="nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              aria-current={t.id === tab.id ? 'page' : undefined}
              onClick={() => navigate(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="brand-sub" style={{ marginTop: '1.5rem' }}>
          {totals.done}/{totals.issues} done
          <br />
          {totals.openDecisions} decisions open
        </div>
      </nav>
      <main className="main">
        <View />
      </main>
    </div>
  )
}
