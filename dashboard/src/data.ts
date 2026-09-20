import roadmapJson from '../../docs/roadmap/roadmap.json'
import notesJson from '../data/notes.json'
import bookmarksJson from '../data/bookmarks.json'
import type { Bookmark, Note, Roadmap, Status } from './types.ts'

export const roadmap = roadmapJson as unknown as Roadmap
export const notes = notesJson as Note[]
export const bookmarks = bookmarksJson as Bookmark[]

export const STATUS_LABEL: Record<Status, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
  canceled: 'Canceled',
}

export const STATUS_ORDER: Status[] = [
  'in_progress',
  'in_review',
  'todo',
  'backlog',
  'done',
  'canceled',
]

export const projectsInOrder = [...roadmap.projects].sort((a, b) => a.order - b.order)
export const decisionsInOrder = [...roadmap.decisions].sort((a, b) => a.order - b.order)

export function issuesForProject(projectId: string) {
  return roadmap.issues
    .filter((i) => i.project === projectId)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.priority - b.priority)
}

export function countBy<T extends string>(values: T[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of values) out[v] = (out[v] ?? 0) + 1
  return out
}

export const totals = {
  issues: roadmap.issues.length,
  done: roadmap.issues.filter((i) => i.status === 'done').length,
  points: roadmap.issues.reduce((sum, i) => sum + (i.estimate ?? 0), 0),
  pointsDone: roadmap.issues
    .filter((i) => i.status === 'done')
    .reduce((sum, i) => sum + (i.estimate ?? 0), 0),
  openDecisions: roadmap.decisions.filter((d) => !d.chosen).length,
}
