// Shapes of docs/roadmap/roadmap.json, which scripts/roadmap.mjs also reads.
// Keep these in step with that file; the dashboard never writes it.

export type Status = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled'

export interface Project {
  id: string
  name: string
  order: number
  short: string
  summary: string
  target: string
}

export interface DecisionOption {
  id: string
  label: string
  detail: string
}

export interface Decision {
  id: string
  key: string
  order: number
  title: string
  question: string
  options: DecisionOption[]
  recommended: string | null
  chosen: string | null
}

export interface Issue {
  key: string
  title: string
  summary: string
  project: string
  status: Status
  priority: number
  estimate: number
  labels?: string[]
  blockedBy?: string[]
  steps?: string[]
  acceptance?: string[]
  notes?: string
  code?: string
  updatedAt?: string
}

export interface Roadmap {
  projects: Project[]
  decisions: Decision[]
  issues: Issue[]
}

// dashboard/data/notes.json — owned by the dashboard, not by the roadmap generator.
export interface Note {
  id: string
  title: string
  date: string
  tags: string[]
  body: string[]
}
