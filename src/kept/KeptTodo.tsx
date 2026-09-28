import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Checkbox } from '@base-ui/react/checkbox';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { Separator } from './parts.tsx';

// /todo (signed in): Kept's focused roadmap and your own tasks.
// Checked items and your own tasks are remembered in this browser.

interface Task {
  id: string;
  title: string;
  detail?: string;
}

const NOW: Task[] = [
  { id: 'backend', title: 'Build the data layer', detail: 'Supabase schema, storage, and row-level security.' },
  { id: 'repository', title: 'Connect the library', detail: 'Replace mock references, boards, and notes with persisted data.' },
  { id: 'signin', title: 'Real sign-in', detail: 'Authenticate the actual owner account.' },
  { id: 'mfa', title: 'Two-factor authentication', detail: 'Protect each sign-in with a second factor.' },
  { id: 'reference-detail', title: 'Reference detail view', detail: 'Create a proper home for an individual saved reference.' },
  { id: 'reference-metadata', title: 'Reference metadata', detail: 'Store the context that makes a reference useful later: title, source, notes, tags, dates, and related information.' },
  { id: 'titles', title: 'Rename references', detail: 'Allow saved references to have proper titles instead of relying on filenames.' },
  { id: 'boxes', title: 'Box annotations', detail: 'Drag to mark a specific region of an image alongside existing pin-style annotations.' },
  { id: 'search', title: 'Search the library', detail: 'Find references by title, notes, tags, board, source, and other saved metadata.' },
  { id: 'deploy', title: 'Ship to kept.design', detail: 'Configure production environment variables and point the real domain at the working app.' },
];

const NEXT_GROUPS: { heading: string; tasks: Task[] }[] = [
  {
    heading: 'Capture',
    tasks: [
      { id: 's-keep-anywhere', title: 'Keep from anywhere', detail: 'Save an image and its source from an iOS share extension or desktop “Keep this” action.' },
      { id: 's-paste-link', title: 'Paste a link to keep it', detail: 'Drop in a URL; Kept fetches the image and records the source.' },
      { id: 's-dupes', title: 'Catch duplicates', detail: 'Warn when an image appears to have already been kept.' },
    ],
  },
  {
    heading: 'Organize',
    tasks: [
      { id: 's-bulk', title: 'Select many', detail: 'Multi-select references to tag, move, edit, or remove them in one action.' },
      { id: 's-smart', title: 'Smart collections', detail: 'Saved searches that automatically fill themselves based on rules.' },
      { id: 's-palette', title: 'Color palettes', detail: 'Extract primary colors from references so the library can be searched or filtered by color.' },
    ],
  },
  {
    heading: 'Work',
    tasks: [
      { id: 's-compare', title: 'Compare references', detail: 'Place two references side by side with annotations visible for critique and comparison.' },
      { id: 's-masonry', title: 'Boards in their real shapes', detail: 'Display board contents in a masonry layout that preserves each reference’s proportions.' },
    ],
  },
  {
    heading: 'Find',
    tasks: [
      { id: 's-resurface', title: 'Resurface', detail: 'Periodically bring back useful references that were saved and forgotten.' },
      { id: 's-command-search', title: 'Command search', detail: 'Open search from anywhere with `/` or ⌘K.' },
    ],
  },
];

const LATER: Task[] = [
  { id: 'later-ios', title: 'iOS app', detail: 'Build the native Kept experience when the core web product is stable.' },
  { id: 'home-screen', title: 'Home screen / PWA', detail: 'Add installable web app behavior, icons, manifests, and safe-area support.' },
  { id: 'invites', title: 'Invite requests', detail: 'Allow people to request access once Kept is ready for users beyond the owner.' },
  { id: 'later-sharing', title: 'Public and shared boards', detail: 'Create shareable board views with controlled visibility.' },
  { id: 's-previews', title: 'Share previews', detail: 'Generate proper preview cards when Kept links are pasted into chats or social apps.' },
  { id: 's-export', title: 'Exports', detail: 'Export references or boards as files, archives, or contact sheets.' },
  { id: 'later-auto-metadata', title: 'Automatic metadata', detail: 'Generate suggested tags, descriptions, and other metadata on capture.' },
  { id: 'later-ocr', title: 'OCR', detail: 'Extract readable text from saved references.' },
  { id: 'later-embeddings', title: 'Embeddings', detail: 'Generate semantic representations for stronger retrieval and similarity search.' },
  { id: 'later-visual-similarity', title: 'Visual similarity', detail: 'Find references that look visually related.' },
  { id: 'later-related', title: 'Related references', detail: 'Surface meaningful relationships between saved items.' },
  { id: 'later-provenance', title: 'Provenance', detail: 'Track where references came from and how they relate to sources, projects, and each other.' },
];

const KEY = 'kept.lab.todo.v1';

interface Saved {
  done: string[];
  mine: Task[];
}

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    // Unreadable or blocked storage.
  }
  return { done: [], mine: [] };
}

export function KeptTodo() {
  const [saved, setSaved] = React.useState<Saved>(readSaved);
  const [draft, setDraft] = React.useState('');

  const update = (next: Saved) => {
    setSaved(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Not remembered; fine for this visit.
    }
  };

  const toggle = (id: string, checked: boolean) =>
    update({
      ...saved,
      done: checked ? [...saved.done, id] : saved.done.filter((d) => d !== id),
    });

  const addMine = () => {
    const title = draft.trim();
    if (!title) return;
    update({ ...saved, mine: [...saved.mine, { id: `mine-${Date.now().toString(36)}`, title }] });
    setDraft('');
  };

  const done = React.useMemo(() => new Set(saved.done), [saved.done]);
  const doneCount = (tasks: Task[]) => tasks.filter((task) => done.has(task.id)).length;

  return (
    <>
      <section className="KeptContents">
        <h1 className="KeptDisplay KeptCol-hero">To do</h1>
      </section>

      <section className="KeptContents">
        <p className="KeptText2 KeptCol-body">
          A focused path from useful to expansive. Check things off as you go.
        </p>
      </section>

      <TaskSection
        id="kept-todo-now"
        heading="NOW"
        tasks={NOW}
        done={done}
        onToggle={toggle}
        meta={`Make Kept useful. · ${doneCount(NOW)} of ${NOW.length} done`}
      />

      <Separator />
      <section className="KeptContents" aria-labelledby="kept-todo-next">
        <div className="KeptStack KeptStack-0 KeptCol-label">
          <h2 id="kept-todo-next" className="KeptText2">NEXT</h2>
          <span className="KeptText1 KeptMuted">Expand the core loop.</span>
        </div>
        <div className="KeptCol-body KeptStack KeptStack-4 KeptStretch">
          {NEXT_GROUPS.map((group) => (
            <section key={group.heading} className="KeptStack KeptStack-0 KeptStretch">
              <h3 className="KeptText1 KeptMuted">{group.heading.toUpperCase()}</h3>
              <TaskList tasks={group.tasks} done={done} onToggle={toggle} />
            </section>
          ))}
        </div>
      </section>

      <TaskSection
        id="kept-todo-later"
        heading="LATER"
        tasks={LATER}
        done={done}
        onToggle={toggle}
        meta="Expand the system."
        muted
      />

      <Separator />
      <section className="KeptContents" aria-labelledby="kept-todo-custom">
        <div className="KeptStack KeptStack-0 KeptCol-label">
          <h2 id="kept-todo-custom" className="KeptText2">
            CUSTOM
          </h2>
          <span className="KeptText1 KeptMuted">Anything else</span>
        </div>
        <div className="KeptCol-body KeptStack KeptStack-4 KeptStretch">
          {saved.mine.length > 0 && (
            <TaskList
              tasks={saved.mine}
              done={done}
              onToggle={toggle}
              onRemove={(id) =>
                update({
                  done: saved.done.filter((d) => d !== id),
                  mine: saved.mine.filter((t) => t.id !== id),
                })
              }
            />
          )}
          <Field.Root className="KeptSearch">
            <Field.Label className="bui-sr-only">Add a task</Field.Label>
            <Input
              className="KeptText2 KeptInput"
              placeholder="Add a task"
              value={draft}
              onValueChange={setDraft}
              enterKeyHint="done"
              autoComplete="off"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addMine();
                }
              }}
            />
            <Button
              className="KeptLink KeptText1 KeptButtonReset KeptButtonText1"
              disabled={!draft.trim()}
              onClick={addMine}
            >
              Add
            </Button>
          </Field.Root>
        </div>
      </section>
    </>
  );
}

function TaskSection({
  id,
  heading,
  meta,
  muted,
  ...list
}: {
  id: string;
  heading: string;
  meta: string;
  muted?: boolean;
  tasks: Task[];
  done: ReadonlySet<string>;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <>
      <Separator />
      <section className="KeptContents" aria-labelledby={id}>
        <div className="KeptStack KeptStack-0 KeptCol-label">
          <h2 id={id} className={`KeptText2${muted ? ' KeptMuted' : ''}`}>
            {heading}
          </h2>
          <span className="KeptText1 KeptMuted">{meta}</span>
        </div>
        <div className="KeptCol-body">
          <TaskList {...list} />
        </div>
      </section>
    </>
  );
}

function TaskList({
  tasks,
  done,
  onToggle,
  onRemove,
}: {
  tasks: Task[];
  done: ReadonlySet<string>;
  onToggle: (id: string, checked: boolean) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <ul className="KeptList">
      {tasks.map((task) => {
        const checked = done.has(task.id);
        return (
          <li key={task.id} className="KeptListItem KeptTodoRow" data-done={checked || undefined}>
            <label className="KeptTodoLabel">
              <Checkbox.Root
                className="KeptCheckbox"
                checked={checked}
                onCheckedChange={(next) => onToggle(task.id, next)}
              >
                <Checkbox.Indicator className="KeptCheckboxIndicator">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="m2 6.5 2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className="KeptStack KeptStack-0">
                <span className="KeptText2 KeptTodoTitle">{task.title}</span>
                {task.detail && <span className="KeptText1 KeptMuted">{task.detail}</span>}
              </span>
            </label>
            {onRemove && (
              <Button
                className="KeptLink KeptText1 KeptButtonReset KeptButtonText1 KeptMuted"
                aria-label={`Remove ${task.title}`}
                onClick={() => onRemove(task.id)}
              >
                Remove
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
